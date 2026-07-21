const Notification = require("../models/Notification");
const User = require("../models/User");

const createNotification = async ({ userId, title, body, type = "info", link, meta }, io) => {
  if (!userId) return null;
  const notification = await Notification.create({
    user_id: userId,
    title,
    body,
    type,
    link,
    meta
  });

  if (io) {
    io.to(`user:${userId}`).emit("notification:new", notification);
  }

  return notification;
};

const notifyAdmins = async ({ title, body, type = "info", link, meta }, io) => {
  const admins = await User.find({ role: "admin" });
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
