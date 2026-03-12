const router = require("express").Router();
const ctrl = require("../controllers/staff.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.post("/", protect, authorize("admin"), ctrl.createStaff);
router.get("/", protect, authorize("admin"), ctrl.getAllStaff);

module.exports = router;