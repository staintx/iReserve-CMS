const router = require("express").Router();
const ctrl = require("../controllers/staff.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.get("/me/bookings", protect, authorize("staff", "admin"), ctrl.getMyBookings);
router.get("/me/bookings/:id", protect, authorize("staff", "admin"), ctrl.getMyBooking);
router.put("/me/bookings/:id/report", protect, authorize("staff", "admin"), ctrl.submitReport);
router.put("/me/bookings/:id/equipment-returns", protect, authorize("staff", "admin"), ctrl.submitEquipmentReturns);
router.put("/me/bookings/:id/complete", protect, authorize("staff", "admin"), ctrl.completeEvent);
router.get("/me/availability", protect, authorize("staff", "admin"), ctrl.getMyAvailability);
router.put("/me/availability", protect, authorize("staff", "admin"), ctrl.setMyAvailability);
router.post("/", protect, authorize("admin"), ctrl.createStaff);
router.get("/", protect, authorize("admin"), ctrl.getAllStaff);
router.put("/:id", protect, authorize("admin"), ctrl.updateStaff);
router.delete("/:id", protect, authorize("admin"), ctrl.removeStaff);

module.exports = router;