const router = require("express").Router();
const ctrl = require("../controllers/booking.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { bookingSchema } = require("../validations/booking.validation");

router.post("/", protect, authorize("admin", "staff", "customer"), validate(bookingSchema), ctrl.create);

router.post("/:id/change-request", protect, authorize("customer"), ctrl.requestChange);
router.post("/:id/add-guests", protect, authorize("customer"), ctrl.addGuests);
router.post("/:id/upgrade-booking", protect, authorize("customer"), ctrl.upgradeBooking);
router.post("/:id/verify-returns", protect, authorize("admin", "staff"), ctrl.verifyReturns);
router.get("/availability", protect, ctrl.checkAvailability);
router.get("/", protect, authorize("admin", "staff"), ctrl.getAll);
router.get("/me", protect, ctrl.getMine);
router.get("/:id", protect, ctrl.getById);
router.put("/:id", protect, authorize("admin", "staff"), ctrl.update);
router.post("/:id/refund", protect, authorize("admin"), ctrl.processRefund);
router.delete("/:id", protect, authorize("admin"), ctrl.remove);

module.exports = router;