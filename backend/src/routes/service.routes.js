const express = require("express");
const router = express.Router();
const { protect, optionalProtect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const ctrl = require("../controllers/service.controller");

// GET /api/services - accessible by customers, walk-ins, and admin
router.get("/", optionalProtect, ctrl.getServices);

// Admin-only management endpoints
router.post("/", protect, authorize("admin", "manager"), ctrl.createService);
router.put("/:id", protect, authorize("admin", "manager"), ctrl.updateService);
router.delete("/:id", protect, authorize("admin", "manager"), ctrl.deleteService);

module.exports = router;
