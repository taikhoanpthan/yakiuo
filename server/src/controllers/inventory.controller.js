const InventoryItem = require("../models/InventoryItem");
const cloudinary = require("../config/cloudinary");

const getCurrentInventoryMonth = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}`;
};

const isValidMonth = (month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month);

const syncMonthlyBalance = (item) => {
  const month = item.baselineMonth || getCurrentInventoryMonth();
  item.baselineMonth = month;
  const balance = item.monthlyBalances?.find((entry) => entry.month === month);
  if (balance) {
    balance.currentQuantity = item.quantity;
    balance.updatedAt = new Date();
  } else {
    item.monthlyBalances.push({ month, initialQuantity: item.initialQuantity ?? item.quantity, currentQuantity: item.quantity });
  }
};

const resetMonthlyInventoryBaselines = async () => {
  const baselineMonth = getCurrentInventoryMonth();
  // Reset only the comparison baseline: the live balance and its history stay intact.
  // Do not use an aggregation-pipeline update here: older MongoDB deployments
  // used by this app reject update arrays and return a 500 response.
  const itemsToReset = await InventoryItem.find({
    $or: [
      { baselineMonth: { $ne: baselineMonth } },
      { "monthlyBalances.month": { $ne: baselineMonth } },
    ],
  })
    .select("_id quantity initialQuantity baselineMonth monthlyBalances")
    .lean();
  if (itemsToReset.length) {
    await InventoryItem.bulkWrite(itemsToReset.map((item) => {
      const months = new Set((item.monthlyBalances || []).map((entry) => entry.month));
      const balances = [];
      if (isValidMonth(item.baselineMonth) && !months.has(item.baselineMonth)) {
        balances.push({ month: item.baselineMonth, initialQuantity: item.initialQuantity ?? item.quantity, currentQuantity: item.quantity });
      }
      if (!months.has(baselineMonth)) balances.push({ month: baselineMonth, initialQuantity: item.quantity, currentQuantity: item.quantity });
      return { updateOne: { filter: { _id: item._id }, update: {
        $set: { initialQuantity: item.quantity, baselineMonth },
        ...(balances.length ? { $push: { monthlyBalances: { $each: balances } } } : {}),
      } } };
    }));
  }
  return baselineMonth;
};

const createSelectedMonthSnapshots = async (month, currentMonth) => {
  // A future month starts with the latest live balance. Past months must never
  // be fabricated: if there is no snapshot, that month has no inventory data.
  if (month <= currentMonth) return;
  const items = await InventoryItem.find({ "monthlyBalances.month": { $ne: month } })
    .select("_id quantity")
    .lean();
  if (!items.length) return;
  await InventoryItem.bulkWrite(items.map((item) => ({
    updateOne: {
      filter: { _id: item._id },
      update: { $push: { monthlyBalances: { month, initialQuantity: item.quantity, currentQuantity: item.quantity } } },
    },
  })));
};

const uploadToCloudinary = async (fileBuffer, folder = "yakiuo-erp/inventory") => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    return null;
  }
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    uploadStream.end(fileBuffer);
  });
};

const processImageUpload = async (file) => {
  if (!file) return "";
  try {
    const result = await uploadToCloudinary(file.buffer);
    if (result?.secure_url) {
      return result.secure_url;
    }
  } catch (error) {
    console.warn("Cloudinary upload failed, falling back to data URL:", error.message);
  }
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};

const getInventory = async (req, res) => {
  try {
    const currentMonth = await resetMonthlyInventoryBaselines();
    const {
      search = "",
      category = "",
      status = "",
      checkedMonth = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    if (checkedMonth && !isValidMonth(checkedMonth)) {
      return res.status(400).json({ success: false, message: "Tháng kiểm kê không hợp lệ" });
    }
    const displayMonth = checkedMonth || currentMonth;
    await createSelectedMonthSnapshots(displayMonth, currentMonth);

    const query = {};

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { unit: searchRegex },
        { location: searchRegex },
        { notes: searchRegex },
      ];
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    // A month only shows items that actually have a snapshot for that month.
    // Thus switching to a month before inventory was created returns no data.
    if (checkedMonth) {
      query["monthlyBalances.month"] = displayMonth;
    }

    // Inventory is a running balance, not a monthly record.  Do not hide an
    // item's last known balance simply because a new month has started. The
    // selected month is still used as the label of the PDF report client-side.

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(1000, Math.max(1, Number.parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    const validSortFields = ["name", "quantity", "createdAt", "lastCheckedAt", "status"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

    const [rawItems, total, allStats, distinctCategories] = await Promise.all([
      InventoryItem.find(query)
        .populate("lastCheckedBy", "fullName username avatar")
        .populate("createdBy", "fullName username avatar")
        .populate("updatedBy", "fullName username avatar")
        .populate("stockHistory.performedBy", "fullName username avatar")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      InventoryItem.countDocuments(query),
      InventoryItem.aggregate([
        { $match: query },
        {
          $set: {
            selectedBalance: {
              $arrayElemAt: [{
                $filter: {
                  input: "$monthlyBalances",
                  as: "balance",
                  cond: { $eq: ["$$balance.month", displayMonth] },
                },
              }, 0],
            },
          },
        },
        { $set: { displayedQuantity: { $ifNull: ["$selectedBalance.currentQuantity", "$quantity"] } } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalQuantity: { $sum: "$displayedQuantity" },
            lowStockCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$displayedQuantity", 0] },
                      { $lte: ["$displayedQuantity", "$minQuantity"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            outOfStockCount: {
              $sum: {
                $cond: [{ $lte: ["$displayedQuantity", 0] }, 1, 0],
              },
            },
            inStockCount: {
              $sum: {
                $cond: [{ $gt: ["$displayedQuantity", "$minQuantity"] }, 1, 0],
              },
            },
          },
        },
      ]),
      InventoryItem.distinct("category"),
    ]);

    const items = rawItems.map((item) => {
      const balance = item.monthlyBalances?.find((entry) => entry.month === displayMonth);
      return balance
        ? { ...item, initialQuantity: balance.initialQuantity, quantity: balance.currentQuantity }
        : item;
    });

    const stats = allStats[0] || {
      totalItems: 0,
      totalQuantity: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      inStockCount: 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        items,
        stats,
        categories: distinctCategories.filter(Boolean),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Get inventory failed:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách hàng hóa",
    });
  }
};

const getInventoryItemById = async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id)
      .populate("lastCheckedBy", "fullName username avatar")
      .populate("createdBy", "fullName username avatar")
      .populate("updatedBy", "fullName username avatar");


    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hàng hóa / công cụ",
      });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Get inventory item by id failed:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin hàng hóa",
    });
  }
};

const createInventoryItem = async (req, res) => {
  try {
    const {
      name,
      quantity,
      unit = "cái",
      category = "Dụng cụ chung",
      location = "",
      minQuantity = 5,
      notes = "",
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên hàng hóa là bắt buộc",
      });
    }

    const numQuantity = Number(quantity);
    if (Number.isNaN(numQuantity) || numQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng hàng hóa phải là số hợp lệ >= 0",
      });
    }

    let imageUrl = req.body.image || "";
    if (req.file) {
      imageUrl = await processImageUpload(req.file);
    }

    const newItem = new InventoryItem({
      name: name.trim(),
      quantity: numQuantity,
      initialQuantity: numQuantity,
      baselineMonth: getCurrentInventoryMonth(),
      monthlyBalances: [{ month: getCurrentInventoryMonth(), initialQuantity: numQuantity, currentQuantity: numQuantity }],
      unit: (unit || "cái").trim(),
      category: (category || "Dụng cụ chung").trim(),
      image: imageUrl.trim(),
      location: (location || "").trim(),
      minQuantity: Math.max(0, Number(minQuantity) || 5),
      notes: (notes || "").trim(),
      lastCheckedAt: new Date(),
      lastCheckedBy: req.user._id,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await newItem.save();
    await newItem.populate([
      { path: "lastCheckedBy", select: "fullName username avatar" },
      { path: "createdBy", select: "fullName username avatar" },
      { path: "updatedBy", select: "fullName username avatar" },
      { path: "stockHistory.performedBy", select: "fullName username avatar" },
    ]);

    req.app.get("io")?.emit("inventory:created", newItem);

    return res.status(201).json({
      success: true,
      message: "Thêm hàng hóa / công cụ thành công",
      data: newItem,
    });
  } catch (error) {
    console.error("Create inventory item failed:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể thêm hàng hóa mới",
    });
  }
};

const updateInventoryItem = async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hàng hóa / công cụ cần sửa",
      });
    }

    const {
      name,
      quantity,
      unit,
      category,
      location,
      minQuantity,
      notes,
    } = req.body;

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Tên hàng hóa không được để trống",
        });
      }
      item.name = name.trim();
    }

    // The live balance is changed through stocktake or the decrement action;
    // editing item details must not overwrite it accidentally.

    if (unit !== undefined) item.unit = unit.trim();
    if (category !== undefined) item.category = category.trim();
    if (location !== undefined) item.location = location.trim();
    if (minQuantity !== undefined) item.minQuantity = Math.max(0, Number(minQuantity) || 0);
    if (notes !== undefined) item.notes = notes.trim();

    if (req.file) {
      item.image = await processImageUpload(req.file);
    } else if (req.body.image !== undefined) {
      item.image = req.body.image.trim();
    }

    item.updatedBy = req.user._id;
    await item.save();
    await item.populate([
      { path: "lastCheckedBy", select: "fullName username avatar" },
      { path: "createdBy", select: "fullName username avatar" },
      { path: "updatedBy", select: "fullName username avatar" },
      { path: "stockHistory.performedBy", select: "fullName username avatar" },
    ]);

    req.app.get("io")?.emit("inventory:updated", item);

    return res.status(200).json({
      success: true,
      message: "Cập nhật hàng hóa thành công",
      data: item,
    });
  } catch (error) {
    console.error("Update inventory item failed:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật hàng hóa",
    });
  }
};

const checkInventoryItem = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ quản trị viên mới được kiểm kê hàng hóa",
      });
    }
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hàng hóa / công cụ",
      });
    }

    const { actualQuantity, notes, unit, minQuantity } = req.body;
    const numActual = Number(actualQuantity);
    if (Number.isNaN(numActual) || numActual < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng kiểm kê thực tế phải >= 0",
      });
    }

    const previousQuantity = item.quantity;
    item.quantity = numActual;
    if (item.initialQuantity === undefined || item.initialQuantity === null) {
      item.initialQuantity = previousQuantity;
    }
    if (!item.baselineMonth) item.baselineMonth = getCurrentInventoryMonth();
    syncMonthlyBalance(item);
    if (unit !== undefined) {
      const normalizedUnit = String(unit).trim();
      if (!normalizedUnit || normalizedUnit.length > 30) {
        return res.status(400).json({
          success: false,
          message: "Đơn vị không được để trống và tối đa 30 ký tự",
        });
      }
      item.unit = normalizedUnit;
    }
    if (minQuantity !== undefined) {
      const normalizedMinQuantity = Number(minQuantity);
      if (Number.isNaN(normalizedMinQuantity) || normalizedMinQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Mức tồn tối thiểu phải là số không âm",
        });
      }
      item.minQuantity = normalizedMinQuantity;
    }
    if (notes !== undefined) {
      item.notes = notes.trim();
    }
    item.lastCheckedAt = new Date();
    item.lastCheckedBy = req.user._id;
    item.updatedBy = req.user._id;
    item.stockHistory.push({
      action: "stocktake",
      amount: numActual - previousQuantity,
      previousQuantity,
      resultingQuantity: numActual,
      performedBy: req.user._id,
      performedAt: new Date(),
      notes: notes !== undefined ? String(notes).trim() : "",
    });

    await item.save();
    await item.populate([
      { path: "lastCheckedBy", select: "fullName username avatar" },
      { path: "createdBy", select: "fullName username avatar" },
      { path: "updatedBy", select: "fullName username avatar" },
      { path: "stockHistory.performedBy", select: "fullName username avatar" },
    ]);

    req.app.get("io")?.emit("inventory:checked", item);

    return res.status(200).json({
      success: true,
      message: "Kiểm kê số lượng thành công",
      data: item,
    });
  } catch (error) {
    console.error("Check inventory item failed:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể lưu kết quả kiểm kê",
    });
  }
};

const decrementInventoryItem = async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hàng hóa / công cụ" });
    }

    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Số lượng trừ phải lớn hơn 0" });
    }
    if (amount > item.quantity) {
      return res.status(400).json({ success: false, message: "Số lượng trừ không thể lớn hơn số lượng hiện tại" });
    }

    if (item.initialQuantity === undefined || item.initialQuantity === null) item.initialQuantity = item.quantity;
    if (!item.baselineMonth) item.baselineMonth = getCurrentInventoryMonth();
    const previousQuantity = item.quantity;
    item.quantity -= amount;
    syncMonthlyBalance(item);
    item.updatedBy = req.user._id;
    item.stockHistory.push({
      action: "decrement",
      amount,
      previousQuantity,
      resultingQuantity: item.quantity,
      performedBy: req.user._id,
      performedAt: new Date(),
    });
    await item.save();
    await item.populate([
      { path: "lastCheckedBy", select: "fullName username avatar" },
      { path: "createdBy", select: "fullName username avatar" },
      { path: "updatedBy", select: "fullName username avatar" },
      { path: "stockHistory.performedBy", select: "fullName username avatar" },
    ]);
    req.app.get("io")?.emit("inventory:updated", item);
    return res.status(200).json({ success: true, message: "Đã trừ số lượng hàng hóa", data: item });
  } catch (error) {
    console.error("Decrement inventory item failed:", error);
    return res.status(500).json({ success: false, message: "Không thể trừ số lượng hàng hóa" });
  }
};

const deleteInventoryItem = async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hàng hóa / công cụ cần xóa",
      });
    }

    req.app.get("io")?.emit("inventory:deleted", { _id: req.params.id });

    return res.status(200).json({
      success: true,
      message: `Đã xóa hàng hóa "${item.name}"`,
      data: { _id: req.params.id },
    });
  } catch (error) {
    console.error("Delete inventory item failed:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa hàng hóa",
    });
  }
};

const uploadInventoryImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn tệp hình ảnh",
      });
    }

    const url = await processImageUpload(req.file);

    return res.status(201).json({
      success: true,
      message: "Tải ảnh lên thành công",
      data: { url },
    });
  } catch (error) {
    console.error("Upload inventory image failed:", error);
    return res.status(500).json({
      success: false,
      message: "Không thể tải ảnh lên",
    });
  }
};

module.exports = {
  getInventory,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  checkInventoryItem,
  decrementInventoryItem,
  deleteInventoryItem,
  uploadInventoryImage,
};
