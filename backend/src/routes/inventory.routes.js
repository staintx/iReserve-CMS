const router = require("express").Router();
const ctrl = require("../controllers/inventory.controller");
const upload = require("../middleware/upload.middleware");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.get("/public", ctrl.getPublic);
router.get("/availability", protect, authorize("admin"), ctrl.getAvailability);
router.post("/parse-ai", protect, authorize("admin"), upload.single("file"), ctrl.parseWithAI);
router.post("/bulk", protect, authorize("admin"), ctrl.createBulk);
router.post("/", protect, authorize("admin"), ctrl.create);
router.get("/", protect, authorize("admin"), ctrl.getAll);
router.get("/:id", protect, authorize("admin"), ctrl.getById);
router.get("/:id/logs", protect, authorize("admin"), ctrl.getLogs);
router.put("/:id", protect, authorize("admin"), ctrl.update);
router.delete("/:id", protect, authorize("admin"), ctrl.remove);

module.exports = router;