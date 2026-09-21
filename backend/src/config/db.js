const mongoose = require("mongoose");
const User = require("../models/User");

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState >= 1) {
    isConnected = true;
    return;
  }
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("Neither MONGO_URI nor MONGODB_URI is defined in environment variables.");
    }
    const conn = await mongoose.connect(mongoUri);
    isConnected = conn.connections[0].readyState >= 1;
    console.log(" MongoDB Connected");

    // Clean up legacy null usernames before enforcing sparse unique index.
    await User.updateMany({ username: null }, { $unset: { username: "" } });
    await User.syncIndexes();
  } catch (err) {
    console.error(" MongoDB Error:", err.message);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

module.exports = connectDB;