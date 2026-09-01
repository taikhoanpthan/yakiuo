const dotenv = require("dotenv");
const dns = require("dns");

// =========================
// ENV
// =========================

dotenv.config();

// Dùng DNS public để tránh lỗi resolve MongoDB Atlas
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// =========================
// IMPORTS
// =========================

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");
const User = require("./models/User");

// =========================
// ROUTES
// =========================

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const notificationRoutes = require("./routes/notification.routes");
const systemRoutes = require("./routes/system.routes");
const uploadRoutes = require("./routes/upload.routes");
const todoRoutes = require("./routes/todo.routes");
const commissionRoutes = require("./routes/commission.routes");
const commissionGGRoutes = require("./routes/commissionGG.routes");
const feedbackTagRoutes = require("./routes/feedbackTag.routes");
const workScheduleRoutes = require("./routes/workSchedule.routes");
const conversationRoutes = require("./routes/conversation.routes");
const messageRoutes = require("./routes/message.routes");
const cfsRoutes = require("./routes/cfs.routes");
// =========================
// SOCKET
// =========================

// File:
// server/src/sockets/chat.socket.js
const setupChatSocket = require("./sockets/chat.socket");

// =========================
// APP
// =========================

const app = express();
app.set("trust proxy", 1);

// Tạo HTTP server từ Express
// Socket.IO sẽ chạy trên server này
const server = http.createServer(app);

// =========================
// CORS
// =========================

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log("Allowed CORS origins:", allowedOrigins);

// =========================
// EXPRESS CORS
// =========================

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có Origin
      // Ví dụ:
      // Postman
      // Server-to-server
      if (!origin) {
        return callback(null, true);
      }

      // Cho phép frontend trong whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked: ${origin}`);

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },

    credentials: true,
  }),
);

// =========================
// SOCKET.IO
// =========================

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },

  // Ưu tiên WebSocket
  // Nếu không được thì fallback polling
  transports: ["websocket", "polling"],

  // Tự động reconnect phía client
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

// Không cho client tự nhận là một user khác qua payload socket.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select("_id status");

    if (!user || user.status !== "active") {
      return next(new Error("Account is inactive"));
    }

    socket.data.authUserId = String(user._id);
    return next();
  } catch (error) {
    return next(new Error("Invalid or expired token"));
  }
});

app.set("io", io);

// =========================
// SETUP SOCKET
// =========================

// Toàn bộ socket event nằm trong:
// src/sockets/chat.socket.js
setupChatSocket(io);

// =========================
// BODY PARSER
// =========================

app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true }));

// =========================
// API ROUTES
// =========================

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/feedback", feedbackRoutes);

app.use("/api/notifications", notificationRoutes);
app.use("/api/system", systemRoutes);

app.use("/api/upload", uploadRoutes);

app.use("/api/todos", todoRoutes);

app.use("/api/commissions", commissionRoutes);

app.use("/api/commission-gg", commissionGGRoutes);

app.use("/api/feedback-tags", feedbackTagRoutes);

app.use("/api/work-schedule", workScheduleRoutes);

app.use("/api/conversations", conversationRoutes);

app.use("/api/messages", messageRoutes);

app.use("/api/cfs", cfsRoutes);
// =========================
// CLOUDINARY TEST
// =========================

app.get("/api/cloudinary", (req, res) => {
  res.json({
    success: true,

    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,

    apiKeyConfigured: !!process.env.CLOUDINARY_API_KEY,

    apiSecretConfigured: !!process.env.CLOUDINARY_API_SECRET,
  });
});

// =========================
// API HEALTH CHECK
// =========================

app.get("/api", (req, res) => {
  res.json({
    success: true,

    message: "Yakiuo ERP API is running 🚀",

    environment: process.env.NODE_ENV || "development",

    socket: "enabled",

    socketTransport: ["websocket", "polling"],
  });
});

// =========================
// SOCKET HEALTH CHECK
// =========================

app.get("/api/socket", (req, res) => {
  res.json({
    success: true,
    message: "Socket.IO server is running 🔌",
  });
});

// =========================
// 404
// =========================

app.use((req, res) => {
  res.status(404).json({
    success: false,

    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =========================
// GLOBAL ERROR HANDLER
// =========================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  // CORS error
  if (err.message?.startsWith("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(err.status || 500).json({
    success: false,

    message: err.message || "Internal server error",
  });
});

// =========================
// PORT
// =========================

const PORT = process.env.PORT || 4000;

// =========================
// START SERVER
// =========================

const startServer = async () => {
  try {
    // =========================
    // DATABASE
    // =========================

    await connectDB();

    // =========================
    // HTTP + SOCKET SERVER
    // =========================

    server.listen(PORT, "0.0.0.0", () => {
      console.log("");
      console.log("====================================");
      console.log("🚀 YAKIUO ERP SERVER");
      console.log("====================================");

      console.log(`🌐 API: http://localhost:${PORT}`);

      console.log(`🔌 Socket.IO: enabled`);

      console.log(`🔗 Socket URL: http://localhost:${PORT}`);

      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);

      console.log(
        `☁️ Cloudinary: ${
          process.env.CLOUDINARY_CLOUD_NAME ? "configured" : "not configured"
        }`,
      );

      console.log(
        `🔐 JWT: ${
          process.env.JWT_ACCESS_SECRET ? "configured" : "not configured"
        }`,
      );

      console.log(`🗄️ MongoDB: connected`);

      console.log(
        `🌍 Frontend: ${process.env.FRONTEND_URL || "http://localhost:5173"}`,
      );

      console.log("====================================");
      console.log("");
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);

    process.exit(1);
  }
};

// =========================
// START
// =========================

startServer();
