const router = require("express").Router();
const ctrl = require("../controllers/message.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/conversations", protect, ctrl.listConversations);
router.post("/conversations", protect, ctrl.createConversation);
router.get("/conversations/:id", protect, ctrl.getConversation);
router.patch("/conversations/:id/read", protect, ctrl.markAsRead);
router.get("/conversations/:id/messages", protect, ctrl.getMessages);
router.post("/conversations/:id/messages", protect, ctrl.sendMessage);

module.exports = router;
