const router = require("express").Router();
const ctrl = require("../controllers/manager.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.get("/summary", protect, authorize("admin", "manager"), ctrl.getSummary);
router.get("/bookings", protect, authorize("admin", "manager"), ctrl.getBookings);
router.get("/bookings/:id", protect, authorize("admin", "manager"), ctrl.getBookingById);
router.put("/bookings/:id/assign-staff", protect, authorize("admin", "manager"), ctrl.assignStaff);
router.put("/bookings/:id/notes", protect, authorize("admin", "manager"), ctrl.addManagerNote);
router.put("/bookings/:id/equipment", protect, authorize("admin", "manager"), ctrl.updateEquipment);
router.put("/bookings/:id/complete", protect, authorize("admin", "manager"), ctrl.markCompleted);
router.get("/staff", protect, authorize("admin", "manager"), ctrl.getStaffList);
router.get("/staff/:id/calendar", protect, authorize("admin", "manager"), ctrl.getStaffCalendar);

module.exports = router;
