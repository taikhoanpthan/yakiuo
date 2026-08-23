const dns = require("dns");
const mongoose = require("mongoose");

// MongoDB Atlas SRV cần DNS resolve.
// DNS mặc định của mạng hiện tại đang bị ECONNREFUSED,
// nên dùng Google DNS + Cloudflare DNS.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing. Add it to server/.env.");
  }

  try {
    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};console.log("MongoDB database:", mongoose.connection.name);

module.exports = connectDB;