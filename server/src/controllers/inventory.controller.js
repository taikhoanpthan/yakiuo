const InventoryItem = require("../models/InventoryItem");
const cloudinary = require("../config/cloudinary");

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
    const {
      search = "",
      category = "",
      status = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
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

    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    const validSortFields = ["name", "quantity", "createdAt", "lastCheckedAt", "status"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

    const [items, total, allStats, distinctCategories] = await Promise.all([
      InventoryItem.find(query)
        .populate("lastCheckedBy", "fullName username avatar")
        .populate("createdBy", "fullName username avatar")
        .populate("updatedBy", "fullName username avatar")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      InventoryItem.countDocuments(query),
      InventoryItem.aggregate([
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalQuantity: { $sum: "$quantity" },
            lowStockCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$quantity", 0] },
                      { $lte: ["$quantity", "$minQuantity"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            outOfStockCount: {
              $sum: {
                $cond: [{ $lte: ["$quantity", 0] }, 1, 0],
              },
            },
            inStockCount: {
              $sum: {
                $cond: [{ $gt: ["$quantity", "$minQuantity"] }, 1, 0],
              },
            },
          },
        },
      ]),
      InventoryItem.distinct("category"),
    ]);

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
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ quản trị viên (Admin) mới có quyền thêm hàng hóa / công cụ",
      });
    }

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
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ quản trị viên (Admin) mới có quyền cập nhật thông tin hàng hóa",
      });
    }

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

    if (quantity !== undefined) {
      const numQuantity = Number(quantity);
      if (Number.isNaN(numQuantity) || numQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Số lượng hàng hóa phải là số hợp lệ >= 0",
        });
      }
      item.quantity = numQuantity;
    }

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
    item.lastCheckedAt = new Date();
    item.lastCheckedBy = req.user._id;

    await item.save();
    await item.populate([
      { path: "lastCheckedBy", select: "fullName username avatar" },
      { path: "createdBy", select: "fullName username avatar" },
      { path: "updatedBy", select: "fullName username avatar" },
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
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hàng hóa / công cụ",
      });
    }

    const { actualQuantity, notes } = req.body;
    const numActual = Number(actualQuantity);
    if (Number.isNaN(numActual) || numActual < 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng kiểm kê thực tế phải >= 0",
      });
    }

    item.quantity = numActual;
    if (notes !== undefined) {
      item.notes = notes.trim();
    }
    item.lastCheckedAt = new Date();
    item.lastCheckedBy = req.user._id;
    item.updatedBy = req.user._id;

    await item.save();
    await item.populate([
      { path: "lastCheckedBy", select: "fullName username avatar" },
      { path: "createdBy", select: "fullName username avatar" },
      { path: "updatedBy", select: "fullName username avatar" },
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

const deleteInventoryItem = async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Chỉ quản trị viên (Admin) mới có quyền xóa hàng hóa / công cụ",
      });
    }

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
  deleteInventoryItem,
  uploadInventoryImage,
};
