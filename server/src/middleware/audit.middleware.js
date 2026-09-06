const { recordActivity } = require("../services/userActivity.service");

const resourceLabels = {
  users: "tài khoản",
  feedback: "feedback khách hàng",
  "feedback-tags": "nhãn feedback",
  todos: "công việc",
  commissions: "hoa hồng",
  "commission-gg": "hoa hồng Google",
  "work-schedule": "lịch làm việc",
  notifications: "thông báo",
  messages: "tin nhắn",
  conversations: "cuộc trò chuyện",
  cfs: "CFS",
  system: "cài đặt hệ thống",
  upload: "tệp đính kèm",
};

const getAuditTarget = (req) => {
  // Middleware này chạy ở cấp app nên req.path vẫn chứa tiền tố /api.
  const path = req.originalUrl
    .split("?")[0]
    .replace(/^\/api\/?/, "")
    .replace(/^\/+|\/+$/g, "");
  const [resourceKey = "", ...rest] = path.split("/");
  const resource = resourceLabels[resourceKey] || resourceKey || "dữ liệu hệ thống";
  const identifier = rest.length ? rest.join("/") : "";
  const body = req.body || {};

  // Chỉ giữ định danh hữu ích cho admin; tuyệt đối không lưu mật khẩu/nội dung feedback.
  const context = {
    feedback: body.tableNumber ? `bàn ${body.tableNumber}` : "",
    todos: body.title || body.name || "",
    users: body.username || body.fullName || "",
    commissions: body.month || body.date || "",
    "work-schedule": body.date || body.workDate || "",
    "feedback-tags": body.label || body.name || "",
  }[resourceKey] || "";

  const suffix = context || identifier;

  return { resource, target: suffix ? `${resource} (${suffix})` : resource };
};

const auditMutations = (req, res, next) => {
  const activityType = { POST: "created", PUT: "updated", PATCH: "updated", DELETE: "deleted" }[req.method];
  if (!activityType) return next();

  res.once("finish", () => {
    // Chỉ ghi lại thao tác đã thành công và đã được xác thực.
    if (res.statusCode < 200 || res.statusCode >= 300 || !req.user?._id) return;

    const { resource, target } = getAuditTarget(req);
    void recordActivity({
      user: req.user._id,
      type: activityType,
      resource,
      target,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || "",
    });
  });

  next();
};

module.exports = { auditMutations };
