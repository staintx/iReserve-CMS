const Notification = require("../models/Notification");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");

const getManagerNotificationFilter = async (managerId) => {
  const assignedBookings = await Booking.find({ event_manager_id: managerId }).distinct("_id");
  const assignedIdList = [...assignedBookings, ...assignedBookings.map((id) => String(id))];

  return {
    $and: [
      {
        link: {
          $not: {
            $regex: "^/admin/(messages|payments|refunds|inventory|staff|managers|analytics|logs|business-info|quotes|bookings/inquiries|bookings/calendar|bookings/history)",
            $options: "i"
          }
        }
      },
      { "meta.conversation_id": { $exists: false } },
      { "meta.payment_id": { $exists: false } },
      { "meta.inventory_id": { $exists: false } },
      {
        title: {
          $not: {
            $regex: "payment|refund|low stock|customer message|new inquiry|quotation",
            $options: "i"
          }
        }
      },
      {
        $or: [
          { link: { $regex: "^/manager/", $options: "i" } },
          { "meta.action": "assign" },
          {
            $and: [
              { "meta.booking_id": { $exists: true, $in: assignedIdList } },
              {
                title: {
                  $not: {
                    $regex: "cancelled & refunded|cancellation requested|refund",
                    $options: "i"
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  };
};

exports.getMine = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 100);
  const page = Math.max(1, Number(req.query.page) || 1);
  const skip = (page - 1) * limit;

  const query = { user_id: req.user._id };
  if (req.query.unread === "true") query.is_read = false;

  if (req.user.role === "manager") {
    const managerFilter = await getManagerNotificationFilter(req.user._id);
    query.$and = managerFilter.$and;
  }

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({
      user_id: req.user._id,
      is_read: false,
      ...(query.$and ? { $and: query.$and } : {})
    })
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

  const io = req.app.get("io");
  if (io) {
    io.to(`user:${req.user._id}`).emit("notification:read", { id: notification._id });
  }

  res.json(notification);
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const query = { user_id: req.user._id, is_read: false };
  if (req.user.role === "manager") {
    const managerFilter = await getManagerNotificationFilter(req.user._id);
    query.$and = managerFilter.$and;
  }

  await Notification.updateMany(
    query,
    { is_read: true, read_at: new Date() }
  );

  const io = req.app.get("io");
  if (io) {
    io.to(`user:${req.user._id}`).emit("notification:read_all");
  }

  res.json({ ok: true });
});

