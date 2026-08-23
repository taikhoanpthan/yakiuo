const mongoose = require("mongoose");
const dns = require("dns");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

const User = require("../models/User");

dotenv.config();

dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const existingAdmin = await User.findOne({
      username: "admin",
    });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(
      "Admin@123456",
      12
    );

    await User.create({
      username: "admin",
      email: "admin@yakiuo.com",
      passwordHash,
      fullName: "Yakiuo Admin",
      role: "admin",
      status: "active",
    });

    console.log("Admin created successfully");

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error("Create admin failed:");
    console.error(error.message);

    process.exit(1);
  }
};

createAdmin();