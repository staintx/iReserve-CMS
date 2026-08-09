const Notification = require("../models/Notification");
const asyncHandler = require("../utils/asyncHandler");

exports.getMine = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const page = Math.max(1, Number(req.query.page) || 1);
  const skip = (page - 1) * limit;

  const query = { user_id: req.user._id };
  if (req.query.unread === "true") query.is_read = false;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ user_id: req.user._id, is_read: false })
  ]);

  res.json({ items, unreadCount, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id },
    { is_read: true, read_at: new Date() },
    { returnDocument: 'after' }
  );
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  res.json(notification);
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user_id: req.user._id, is_read: false },
    { is_read: true, read_at: new Date() }
  );
  res.json({ ok: true });
});
