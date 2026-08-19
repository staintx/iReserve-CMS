const express = require("express");
const router = express.Router();
const {
  customerChat,
  getCustomerHistory,
  getCustomerConversations,
  getCustomerConversationById,
  deleteCustomerConversation,
  clearCustomerHistory,
  adminChat,
  adminDraftQuotation,
  adminDraftResponse,
  adminFeedbackSummary,
} = require("../controllers/zelle.controller");
const { protect, optionalProtect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

// Customer routes
router.post("/customer/chat", optionalProtect, customerChat);
router.get("/customer/history", optionalProtect, getCustomerHistory);
router.get("/customer/conversations", optionalProtect, getCustomerConversations);
router.get("/customer/conversations/:id", optionalProtect, getCustomerConversationById);
router.delete("/customer/conversations/:id", optionalProtect, deleteCustomerConversation);
router.post("/customer/clear", optionalProtect, clearCustomerHistory);

// Admin & Manager routes
router.post("/admin/chat", protect, authorize("admin", "manager"), adminChat);
router.post("/admin/draft-quotation", protect, authorize("admin", "manager"), adminDraftQuotation);
router.post("/admin/draft-response", protect, authorize("admin", "manager"), adminDraftResponse);
router.get("/admin/feedback-summary", protect, authorize("admin", "manager"), adminFeedbackSummary);

module.exports = router;
