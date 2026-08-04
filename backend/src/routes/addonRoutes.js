const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { getAddons, createAddon, updateAddon, deleteAddon } = require("../controllers/addonController");

router.get("/", getAddons); // Public or Customer

// Admin routes
router.post("/", protect, authorize("admin"), createAddon);
router.put("/:id", protect, authorize("admin"), updateAddon);
router.delete("/:id", protect, authorize("admin"), deleteAddon);

module.exports = router;
