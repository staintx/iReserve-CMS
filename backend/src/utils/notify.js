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

let _adminCache = null;
let _adminCacheTime = 0;
const ADMIN_CACHE_TTL = 30000;

const getCachedAdmins = async () => {
  const now = Date.now();
  if (_adminCache && now - _adminCacheTime < ADMIN_CACHE_TTL) {
    return _adminCache;
  }
  _adminCache = await User.find({ role: { $in: ["admin", "manager"] } }).lean();
  _adminCacheTime = now;
  return _adminCache;
};

const notifyAdmins = async ({ title, body, type = "info", link, meta }, io) => {
  const admins = await getCachedAdmins();
  const notifications = await Promise.all(
    admins.map(admin => createNotification({
      userId: admin._id,
      title,
      body,
      type,
      link,
      meta
    }, io))
  );
  return notifications.filter(Boolean);
};

module.exports = { createNotification, notifyAdmins };
