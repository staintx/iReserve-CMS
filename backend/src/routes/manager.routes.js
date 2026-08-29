const router = require("express").Router();
const ctrl = require("../controllers/manager.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.get("/summary", protect, authorize("manager", "admin"), ctrl.getSummary);
router.get("/me/availability", protect, authorize("manager", "admin"), ctrl.getAvailability);
router.put("/me/availability", protect, authorize("manager", "admin"), ctrl.setAvailability);

router.get("/bookings", protect, authorize("manager", "admin"), ctrl.getBookings);
router.get("/bookings/:id", protect, authorize("manager", "admin"), ctrl.getBooking);
router.put("/bookings/:id/assign-staff", protect, authorize("manager", "admin"), ctrl.assignStaff);
router.put("/bookings/:id/notes", protect, authorize("manager", "admin"), ctrl.addNote);
router.put("/bookings/:id/equipment", protect, authorize("manager", "admin"), ctrl.updateEquipment);
router.put("/bookings/:id/verify-equipment", protect, authorize("manager", "admin"), ctrl.verifyEquipment);
router.put("/bookings/:id/complete", protect, authorize("manager", "admin"), ctrl.markCompleted);

router.get("/staff", protect, authorize("manager", "admin"), ctrl.getStaff);
router.get("/staff/:id/calendar", protect, authorize("manager", "admin"), ctrl.getStaffCalendar);

module.exports = router;
