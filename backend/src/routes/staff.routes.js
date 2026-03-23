const router = require("express").Router();
const ctrl = require("../controllers/staff.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.get("/me/bookings", protect, authorize("staff"), ctrl.getMyBookings);
router.get("/me/availability", protect, authorize("staff"), ctrl.getMyAvailability);
router.put("/me/availability", protect, authorize("staff"), ctrl.setMyAvailability);
router.post("/", protect, authorize("admin"), ctrl.createStaff);
router.get("/", protect, authorize("admin"), ctrl.getAllStaff);
router.put("/:id", protect, authorize("admin"), ctrl.updateStaff);
router.delete("/:id", protect, authorize("admin"), ctrl.removeStaff);

module.exports = router;