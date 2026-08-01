const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/blockedDate.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

// Get all blocked dates (publicly accessible, or at least for customers & admins)
router.get("/", ctrl.getAll);

// Only admins can block dates
router.post("/", protect, authorize("admin", "superadmin"), ctrl.create);

// Only admins can remove blocked dates
router.delete("/:id", protect, authorize("admin", "superadmin"), ctrl.remove);

module.exports = router;
