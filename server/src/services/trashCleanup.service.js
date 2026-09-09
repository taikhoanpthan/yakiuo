const cloudinary = require("../config/cloudinary");
const Commission = require("../models/Commission");
const CommissionGGImage = require("../models/CommissionGGImage");

const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;

const cleanupExpiredTrash = async () => {
  const cutoff = new Date(Date.now() - FIFTEEN_DAYS);
  const images = await CommissionGGImage.find({ trashedAt: { $lte: cutoff } });
  const deletedIds = (await Promise.all(images.map(async (image) => {
    try {
      const result = await cloudinary.uploader.destroy(image.publicId);
      return ["ok", "not found"].includes(result.result) ? image._id : null;
    } catch { return null; }
  }))).filter(Boolean);
  await CommissionGGImage.deleteMany({ _id: { $in: deletedIds } });
  await Commission.deleteMany({ trashedAt: { $lte: cutoff } });
};

const startTrashCleanup = () => {
  cleanupExpiredTrash().catch((error) => console.error("Trash cleanup failed:", error.message));
  const timer = setInterval(() => cleanupExpiredTrash().catch((error) => console.error("Trash cleanup failed:", error.message)), 6 * 60 * 60 * 1000);
  timer.unref();
};

module.exports = { startTrashCleanup };
