const express = require("express");
const router = express.Router();
const { auth, isAdmin } = require("../middleware/auth");
const { getAddons, createAddon, updateAddon, deleteAddon } = require("../controllers/addonController");

router.get("/", getAddons); // Public or Customer

// Admin routes
router.post("/", auth, isAdmin, createAddon);
router.put("/:id", auth, isAdmin, updateAddon);
router.delete("/:id", auth, isAdmin, deleteAddon);

module.exports = router;
