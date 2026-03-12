const mongoose = require("mongoose");

const SystemLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: String,
  details: String
}, { timestamps: true });

module.exports = mongoose.model("SystemLog", SystemLogSchema);