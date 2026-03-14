const mongoose = require("mongoose");
const User = require("../models/User");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(" MongoDB Connected");

    // Clean up legacy null usernames before enforcing sparse unique index.
    await User.updateMany({ username: null }, { $unset: { username: "" } });
    await User.syncIndexes();
  } catch (err) {
    console.error(" MongoDB Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;