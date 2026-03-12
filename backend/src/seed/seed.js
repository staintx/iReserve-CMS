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

    await Package.insertMany([
      {
        name: "Birthday Package 1",
        description: "Perfect for small birthday gatherings",
        size: "20x20",
        price_min: 15000,
        price_max: 17000,
        inclusions: ["Basic setup", "Buffet"],
        add_ons: ["Cake table", "Balloon decor"]
      },
      {
        name: "Wedding Package 2",
        description: "Elegant wedding catering package",
        size: "50x50",
        price_min: 50000,
        price_max: 70000,
        inclusions: ["Stage setup", "Buffet", "Host"],
        add_ons: ["Premium decor", "Live band"]
      }
    ]);

    await MenuItem.insertMany([
      { name: "Grilled Chicken", description: "Juicy grilled chicken", category: "Main Course" },
      { name: "Caesar Salad", description: "Fresh romaine with dressing", category: "Appetizer" },
      { name: "Chocolate Cake", description: "Rich chocolate dessert", category: "Dessert" }
    ]);

    console.log("✅ Seed data inserted");
    process.exit();
  } catch (err) {
    console.error("❌ Seeder Error:", err.message);
    process.exit(1);
  }
};

seed();