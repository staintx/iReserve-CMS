const express = require("express");
const router = express.Router();
const inquiryController = require("../controllers/inquiry.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const { turnstileMiddleware } = require("../middleware/turnstile.middleware");

const validate = require("../middleware/validate.middleware");
const { inquirySchema, inquiryUpdateSchema } = require("../validations/inquiry.validation");
const upload = require("../middleware/upload.middleware");

// All routes require authentication
router.use(protect);

router.post("/upload-inspiration", upload.array("images", 5), inquiryController.uploadInspirationImages);
router.post("/", turnstileMiddleware, validate(inquirySchema), inquiryController.createInquiry);
router.get("/", inquiryController.getInquiries);
router.get("/:id", inquiryController.getInquiryById);
router.delete("/:id", inquiryController.deleteInquiry);
// Customer edits their own inquiry's event details, pre-quotation. Ownership
// and editable-status checks live in the controller, not here — PUT below is
// the separate, unguarded admin path and must stay admin-only.
router.patch("/:id", validate(inquiryUpdateSchema), inquiryController.updateInquiryByCustomer);

// Admin only routes for updating
router.use(authorize("admin", "manager"));
router.put("/:id", validate(inquiryUpdateSchema), inquiryController.updateInquiry);
router.patch("/:id/archive", inquiryController.setInquiryArchived);

module.exports = router;
