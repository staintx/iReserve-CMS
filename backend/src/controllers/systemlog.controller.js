const SystemLog = require("../models/SystemLog");
const asyncHandler = require("../utils/asyncHandler");

exports.getAll = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    action,
    entity_type,
    user_id,
    from,
    to,
    search
  } = req.query;

  const filter = {};

  if (action) filter.action = action;
  if (entity_type) filter.entity_type = entity_type;
  if (user_id) filter.user_id = user_id;

  // Date range filter
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = toDate;
    }
  }

  // Text search across details field
  if (search) {
    filter.details = { $regex: search, $options: "i" };
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    SystemLog.find(filter)
      .populate("user_id", "full_name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    SystemLog.countDocuments(filter)
  ]);

  res.json({
    logs,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum)
  });
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await SystemLog.create(req.body));
});