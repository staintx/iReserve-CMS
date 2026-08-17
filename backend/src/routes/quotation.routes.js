const express = require("express");
const router = express.Router();
const quotationController = require("../controllers/quotation.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.use(protect);

// Customer actions
router.get("/inquiry/:inquiryId", quotationController.getQuotationsByInquiry);
router.get("/:id", quotationController.getQuotationById);
router.post("/:id/accept", quotationController.acceptQuotation);
router.post("/:id/revision", quotationController.requestRevision);
router.post("/:id/reject", quotationController.rejectQuotation);

// Admin actions
router.use(authorize("admin", "manager"));
router.get("/", quotationController.getAllQuotations);
router.post("/", quotationController.createQuotation);
router.post("/draft", quotationController.saveQuotationDraft);
router.delete("/draft/:inquiryId", quotationController.deleteQuotationDraft);

module.exports = router;
