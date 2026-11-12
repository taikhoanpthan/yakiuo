const mongoose = require("mongoose");

module.exports = mongoose.model("SystemSetting", new mongoose.Schema({
  key: { type: String, unique: true, default: "system" },
  maintenanceMode: { type: Boolean, default: false },
  features: {
    cfs: { type: Boolean, default: true },
    caro: { type: Boolean, default: true },
    chess: { type: Boolean, default: true },
  },
  // Lưu ma trận phân quyền do admin cấu hình. Không khai báo cứng từng role
  // để có thể thay đổi trực tiếp từ trang quản trị.
  rolePermissions: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true }));
