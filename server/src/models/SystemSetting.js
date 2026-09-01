const mongoose = require("mongoose");
module.exports = mongoose.model("SystemSetting", new mongoose.Schema({ key: { type: String, unique: true, default: "system" }, maintenanceMode: { type: Boolean, default: false } }, { timestamps: true }));
