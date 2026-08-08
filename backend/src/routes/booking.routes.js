const router = require("express").Router();
const ctrl = require("../controllers/booking.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { bookingSchema } = require("../validations/booking.validation");

router.post("/convert-inquiry/:id", protect, authorize("admin", "staff"), ctrl.convertInquiry);
router.post("/from-inquiry/:id", protect, authorize("admin", "staff"), ctrl.convertInquiry);
router.post("/", protect, authorize("admin", "staff", "customer"), validate(bookingSchema), ctrl.create);

router.post("/:id/change-request", protect, authorize("customer"), ctrl.requestChange);
router.post("/:id/change-request/resolve", protect, authorize("admin", "staff"), ctrl.resolveChangeRequest);
router.post("/:id/propose-revision", protect, authorize("admin", "staff", "customer"), ctrl.proposeRevision);
router.post("/:id/accept-revision", protect, authorize("admin", "staff", "customer"), ctrl.acceptRevision);
router.post("/:id/reject-revision", protect, authorize("admin", "staff", "customer"), ctrl.rejectRevision);
router.put("/:id/send-quote", protect, authorize("admin", "staff"), ctrl.sendQuote);
router.put("/:id/accept-quote", protect, authorize("customer"), ctrl.acceptQuote);
router.post("/:id/add-guests", protect, authorize("customer"), ctrl.addGuests);
router.post("/:id/upgrade-booking", protect, authorize("customer"), ctrl.upgradeBooking);
router.post("/:id/verify-returns", protect, authorize("admin", "staff"), ctrl.verifyReturns);
router.put("/:id/inventory", protect, authorize("admin", "staff"), ctrl.assignInventory);
router.post("/:id/ocular/schedule", protect, authorize("admin", "staff"), ctrl.scheduleOcular);
router.post("/:id/ocular/complete", protect, authorize("admin", "staff"), ctrl.completeOcular);
router.post("/:id/ocular/request", protect, authorize("customer"), ctrl.requestOcular);
router.post("/:id/request-cancellation", protect, authorize("customer"), ctrl.requestCancellation);
router.get("/availability", protect, ctrl.checkAvailability);
router.get("/booked-dates", ctrl.getBookedDates);
router.get("/available-times", ctrl.getAvailableTimes);
router.get("/availability/suggestions", protect, ctrl.suggestDates);
router.get("/", protect, authorize("admin", "staff"), ctrl.getAll);
router.get("/me", protect, ctrl.getMine);
router.get("/:id", protect, ctrl.getById);
router.put("/:id", protect, authorize("admin", "staff"), ctrl.update);
router.post("/:id/refund", protect, authorize("admin"), ctrl.processRefund);
router.delete("/:id", protect, authorize("admin"), ctrl.remove);

module.exports = router;