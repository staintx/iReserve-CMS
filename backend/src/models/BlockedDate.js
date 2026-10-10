const mongoose = require("mongoose");

const blockedDateSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    trim: true,
  },
  group_id: {
    type: String,
    index: true,
  },
  range_start: {
    type: Date,
  },
  range_end: {
    type: Date,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("BlockedDate", blockedDateSchema);
