const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  client_message_id: { type: String, default: null },
  body: { type: String, default: "" },
  attachments: [{
    url: String,
    fileName: String,
    fileType: String,
    size: Number
  }],
  read_by: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    read_at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model("Message", MessageSchema);
