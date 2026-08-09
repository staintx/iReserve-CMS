const Notification = require("../models/Notification");
const User = require("../models/User");

const createNotification = async ({ userId, title, body, type = "info", link, meta }, io) => {
  if (!userId) return null;

  let notification;

  // Consolidate unread chat notifications per user & conversation
  if (meta?.conversation_id) {
    const existing = await Notification.find({
      user_id: userId,
      "meta.conversation_id": meta.conversation_id,
      is_read: false
    }).sort({ createdAt: -1 });

    if (existing.length > 0) {
      const primary = existing[0];
      primary.title = title;
      primary.body = body;
      primary.link = link;
      primary.type = type;
      primary.updatedAt = new Date();
      notification = await primary.save();

      if (existing.length > 1) {
        const extraIds = existing.slice(1).map((doc) => doc._id);
        await Notification.deleteMany({ _id: { $in: extraIds } });
      }
    }
  }

  if (!notification) {
    notification = await Notification.create({
      user_id: userId,
      title,
      body,
      type,
      link,
      meta
    });
  }

  if (io) {
    io.to(`user:${userId}`).emit("notification:new", notification);
  }

  return notification;
};

const notifyAdmins = async ({ title, body, type = "info", link, meta }, io) => {
  // Managers share the admin portal (AdminSidebar/notification bell) and
  // must receive the same admin-side notifications, not just role "admin".
  const admins = await User.find({ role: { $in: ["admin", "manager"] } });
  const notifications = [];
  for (const admin of admins) {
    const notification = await createNotification({
      userId: admin._id,
      title,
      body,
      type,
      link,
      meta
    }, io);
    if (notification) {
      notifications.push(notification);
    }
  }
  return notifications;
};

module.exports = { createNotification, notifyAdmins };
