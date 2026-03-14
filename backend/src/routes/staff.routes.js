const router = require("express").Router();
const ctrl = require("../controllers/staff.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.post("/", protect, authorize("admin"), ctrl.createStaff);
router.get("/", protect, authorize("admin"), ctrl.getAllStaff);
router.put("/:id", protect, authorize("admin"), ctrl.updateStaff);
router.delete("/:id", protect, authorize("admin"), ctrl.removeStaff);

module.exports = router;