const router = require("express").Router();
const ctrl = require("../controllers/manager.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.get("/summary", protect, authorize("manager", "admin"), ctrl.getSummary);
router.get("/me/availability", protect, authorize("manager", "admin"), ctrl.getAvailability);
router.put("/me/availability", protect, authorize("manager", "admin"), ctrl.setAvailability);
router.delete("/me/availability/:id", protect, authorize("manager", "admin"), ctrl.removeAvailability);
router.delete("/me/availability", protect, authorize("manager", "admin"), ctrl.removeAvailability);

router.get("/bookings", protect, authorize("manager", "admin"), ctrl.getBookings);
router.get("/bookings/:id", protect, authorize("manager", "admin"), ctrl.getBooking);
router.put("/bookings/:id/assign-staff", protect, authorize("admin"), ctrl.assignStaff);
router.put("/bookings/:id/report", protect, authorize("manager", "admin"), ctrl.submitReport);
router.put("/bookings/:id/staff-attendance", protect, authorize("manager", "admin"), ctrl.updateStaffAttendance);
router.put("/bookings/:id/equipment-returns", protect, authorize("manager", "admin"), ctrl.submitEquipmentReturns);
router.put("/bookings/:id/equipment-checklist", protect, authorize("manager", "admin"), ctrl.updateEquipmentChecklist);
router.put("/bookings/:id/equipment-notes", protect, authorize("manager", "admin"), ctrl.updateEquipmentNotes);
router.put("/bookings/:id/notes", protect, authorize("manager", "admin"), ctrl.addNote);
router.put("/bookings/:id/equipment", protect, authorize("manager", "admin"), ctrl.updateEquipment);
router.put("/bookings/:id/verify-equipment", protect, authorize("manager", "admin"), ctrl.verifyEquipment);
router.put("/bookings/:id/complete", protect, authorize("manager", "admin"), ctrl.markCompleted);

router.get("/staff", protect, authorize("manager", "admin"), ctrl.getStaff);
router.get("/staff/:id/calendar", protect, authorize("manager", "admin"), ctrl.getStaffCalendar);

module.exports = router;
