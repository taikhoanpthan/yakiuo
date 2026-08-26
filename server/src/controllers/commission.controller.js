const Commission = require("../models/Commission");

const WINE_1M_COMMISSION = 20000;
const WINE_3M_COMMISSION = 50000;
const ABALONE_COMMISSION = 20000;

// =========================
// CALCULATE
// =========================

const calculateCommission = ({ type, wineLevel, wineQty, abaloneQty }) => {
  if (type === "wine") {
    if (!wineLevel) {
      throw new Error("Vui lòng chọn mức rượu");
    }

    if (!wineQty || wineQty < 1) {
      throw new Error("Số lượng rượu phải lớn hơn 0");
    }

    const amount = wineLevel === "3m" ? WINE_3M_COMMISSION : WINE_1M_COMMISSION;

    return wineQty * amount;
  }

  if (type === "abalone") {
    if (!abaloneQty || abaloneQty < 1) {
      throw new Error("Số lượng bào ngư phải lớn hơn 0");
    }

    return abaloneQty * ABALONE_COMMISSION;
  }

  throw new Error("Loại commission không hợp lệ");
};

// =========================
// CREATE
// =========================

const createCommission = async (req, res) => {
  try {
    const { type, date, tableNumber, shift, wineLevel, wineQty, abaloneQty } =
      req.body;

    if (!type) {
      return res.status(400).json({
        message: "Thiếu loại commission",
      });
    }

    if (!date) {
      return res.status(400).json({
        message: "Thiếu ngày",
      });
    }

    if (!tableNumber) {
      return res.status(400).json({
        message: "Thiếu số bàn",
      });
    }

    if (!shift) {
      return res.status(400).json({
        message: "Thiếu ca",
      });
    }

    // Backend tự tính tiền
    const commission = calculateCommission({
      type,
      wineLevel,
      wineQty,
      abaloneQty,
    });

    const newCommission = await Commission.create({
      type,
      date,
      tableNumber,
      shift,

      wineLevel: type === "wine" ? wineLevel : null,

      wineQty: type === "wine" ? wineQty : 0,

      abaloneQty: type === "abalone" ? abaloneQty : 0,

      commission,

      createdBy: req.user._id,
    });

    const result = await Commission.findById(newCommission._id).populate(
      "createdBy",
      "fullName username avatar",
    );

    return res.status(201).json({
      message: "Tạo commission thành công",
      data: result,
    });
  } catch (error) {
    console.error("createCommission:", error);

    return res.status(500).json({
      message: error.message || "Không thể tạo commission",
    });
  }
};

// =========================
// GET MY COMMISSIONS
// =========================

const getMyCommissions = async (req, res) => {
  try {
    const commissions = await Commission.find({
      createdBy: req.user._id,
    })
      .populate("createdBy", "fullName username avatar")
      .sort({
        date: -1,
        createdAt: -1,
      });

    return res.json({
      data: commissions,
    });
  } catch (error) {
    console.error("getMyCommissions:", error);

    return res.status(500).json({
      message: "Không thể lấy danh sách commission",
    });
  }
};

// =========================
// GET ONE
// =========================

const getCommissionById = async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id).populate(
      "createdBy",
      "fullName username avatar",
    );

    if (!commission) {
      return res.status(404).json({
        message: "Không tìm thấy commission",
      });
    }

    return res.json({
      data: commission,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể lấy commission",
    });
  }
};

// =========================
// UPDATE
// =========================

const updateCommission = async (req, res) => {
  try {
    const commission = await Commission.findById(req.params.id);

    if (!commission) {
      return res.status(404).json({
        message: "Không tìm thấy commission",
      });
    }

    const { type, date, tableNumber, shift, wineLevel, wineQty, abaloneQty } =
      req.body;

    const nextType = type ?? commission.type;

    const nextWineLevel = wineLevel ?? commission.wineLevel;

    const nextWineQty = wineQty ?? commission.wineQty;

    const nextAbaloneQty = abaloneQty ?? commission.abaloneQty;

    const calculatedCommission = calculateCommission({
      type: nextType,
      wineLevel: nextWineLevel,
      wineQty: nextWineQty,
      abaloneQty: nextAbaloneQty,
    });

    commission.type = nextType;

    if (date !== undefined) {
      commission.date = date;
    }

    if (tableNumber !== undefined) {
      commission.tableNumber = tableNumber;
    }

    if (shift !== undefined) {
      commission.shift = shift;
    }

    commission.wineLevel = nextType === "wine" ? nextWineLevel : null;

    commission.wineQty = nextType === "wine" ? nextWineQty : 0;

    commission.abaloneQty = nextType === "abalone" ? nextAbaloneQty : 0;

    commission.commission = calculatedCommission;

    await commission.save();

    const result = await Commission.findById(commission._id).populate(
      "createdBy",
      "fullName username avatar",
    );

    return res.json({
      message: "Cập nhật commission thành công",
      data: result,
    });
  } catch (error) {
    console.error("updateCommission:", error);

    return res.status(500).json({
      message: error.message || "Không thể cập nhật commission",
    });
  }
};

// =========================
// DELETE
// =========================

const deleteCommission = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu ID commission" });
    }
    /* * Chỉ cho phép user xóa commission * do chính mình tạo. */ const commission =
      await Commission.findOne({ _id: id, createdBy: req.user._id });
    if (!commission) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Không tìm thấy commission hoặc bạn không có quyền xóa",
        });
    }
    await commission.deleteOne();
    return res
      .status(200)
      .json({
        success: true,
        message: "Xóa commission thành công",
        data: { deletedId: id },
      });
  } catch (error) {
    console.error("deleteCommission:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Không thể xóa commission",
        error: error.message,
      });
  }
};
const getCommissionsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const { month, year } = req.query;

    const filter = {
      createdBy: userId,
    };

    // Lọc theo tháng/năm nếu frontend gửi
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);

      const endDate = new Date(Number(year), Number(month), 1);

      filter.date = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const commissions = await Commission.find(filter)
      .populate("createdBy", "fullName username avatar email phone role")
      .sort({
        date: -1,
        createdAt: -1,
      });

    return res.json({
      data: commissions,
    });
  } catch (error) {
    console.error("getCommissionsByUser:", error);

    return res.status(500).json({
      message: "Không thể lấy commission của nhân viên",
    });
  }
};
const deleteMyCommissionsByMonth = async (req, res) => {
  try {
    const userId = req.user._id;
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    // Validate tháng và năm
    const isValidMonth = Number.isInteger(month) && month >= 1 && month <= 12;
    const isValidYear = Number.isInteger(year) && year >= 2000;

    if (!isValidMonth || !isValidYear) {
      return res.status(400).json({
        success: false,
        message: !isValidMonth ? "Tháng không hợp lệ" : "Năm không hợp lệ",
      });
    }

    // Xác định khoảng thời gian trong tháng
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Thực hiện xóa dữ liệu dựa theo createdBy và khoảng thời gian
    const result = await Commission.deleteMany({
      createdBy: userId,
      date: { $gte: startDate, $lt: endDate },
    });

    return res.status(200).json({
      success: true,
      message: `Đã xóa ${result.deletedCount} commission tháng ${month}/${year}`,
      data: {
        deletedCount: result.deletedCount,
        month,
        year,
      },
    });
  } catch (error) {
    console.error("DELETE MY COMMISSIONS BY MONTH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa commission trong tháng",
      error: error.message,
    });
  }
};
module.exports = {
  createCommission,
  getMyCommissions,
  getCommissionById,
  updateCommission,
  deleteCommission,
  getCommissionsByUser,
  deleteMyCommissionsByMonth,
};
