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
const cors = require("cors");

const connectDB = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const feedbackRoutes = require("./routes/feedback.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const notificationRoutes = require("./routes/notification.routes");
const uploadRoutes = require("./routes/upload.routes");
const todoRoutes = require("./routes/todo.routes");

// =========================
// APP
// =========================

const app = express();

// =========================
// CORS
// =========================

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log("Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép request không có Origin
      // Ví dụ: Postman, server-to-server
      if (!origin) {
        return callback(null, true);
      }

      // Cho phép frontend nằm trong danh sách
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked: ${origin}`);

      return callback(
        new Error(`CORS blocked for origin: ${origin}`),
        false,
      );
    },

    credentials: true,
  }),
);

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

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/upload", uploadRoutes);

app.use("/api/todos", todoRoutes);

// =========================
// CLOUDINARY TEST
// =========================

app.get("/api/cloudinary", (req, res) => {
  res.json({
    success: true,

    cloudName:
      process.env.CLOUDINARY_CLOUD_NAME || null,

    apiKeyConfigured:
      !!process.env.CLOUDINARY_API_KEY,

    apiSecretConfigured:
      !!process.env.CLOUDINARY_API_SECRET,
  });
});

// =========================
// API HEALTH CHECK
// =========================

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "Yakiuo ERP API is running 🚀",
    environment:
      process.env.NODE_ENV || "development",
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
    message:
      err.message || "Internal server error",
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
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `🚀 Yakiuo ERP API running on port ${PORT}`,
      );

      console.log(
        `🌐 Environment: ${
          process.env.NODE_ENV || "development"
        }`,
      );

      console.log(
        `☁️ Cloudinary: ${
          process.env.CLOUDINARY_CLOUD_NAME
            ? "configured"
            : "not configured"
        }`,
      );

      console.log(
        `🔐 JWT: ${
          process.env.JWT_ACCESS_SECRET
            ? "configured"
            : "not configured"
        }`,
      );

      console.log(
        `🌍 Frontend: ${
          process.env.FRONTEND_URL ||
          "http://localhost:5173"
        }`,
      );
    });
  } catch (error) {
    console.error(
      "❌ MongoDB connection failed:",
      error.message,
    );

    process.exit(1);
  }
};

startServer();