const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Package = require("../models/Package");
const MenuItem = require("../models/MenuItem");

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await User.deleteMany();
    await Package.deleteMany();
    await MenuItem.deleteMany();

    const adminPass = await bcrypt.hash("admin123", 10);

    await User.create({
      full_name: "System Admin",
      email: "admin@ireserve.com",
      username: "admin",
      password: adminPass,
      role: "admin"
    });

    console.log("✅ Seed data inserted");
    process.exit();
  } catch (err) {
    console.error("❌ Seeder Error:", err.message);
    process.exit(1);
  }
};

seed();