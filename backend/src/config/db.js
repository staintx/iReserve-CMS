const mongoose = require("mongoose");
const User = require("../models/User");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("Neither MONGO_URI nor MONGODB_URI is defined in environment variables.");
    }
    await mongoose.connect(mongoUri);
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