const mongoose = require("mongoose");

module.exports = mongoose.model("SystemSetting", new mongoose.Schema({
  key: { type: String, unique: true, default: "system" },
  maintenanceMode: { type: Boolean, default: false },
  features: {
    cfs: { type: Boolean, default: true },
    caro: { type: Boolean, default: true },
    chat: { type: Boolean, default: true },
  },
}, { timestamps: true }));
