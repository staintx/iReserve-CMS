const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload.middleware");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { addonSchema, addonUpdateSchema } = require("../validations/addon.validation");
const {
  getAddons,
  getUsage,
  createAddon,
  updateAddon,
  deleteAddon,
  parseWithAI,
  createBulk,
} = require("../controllers/addonController");

router.get("/", getAddons); // Public or Customer

// Admin routes
router.post("/parse-ai", protect, authorize("admin"), upload.single("file"), parseWithAI);
router.post("/bulk", protect, authorize("admin"), createBulk);
router.post("/", protect, authorize("admin"), validate(addonSchema), createAddon);
router.get("/:id/usage", protect, authorize("admin"), getUsage);
router.put("/:id", protect, authorize("admin"), validate(addonUpdateSchema), updateAddon);
router.delete("/:id", protect, authorize("admin"), deleteAddon);

module.exports = router;
