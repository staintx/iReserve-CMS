const router = require("express").Router();
const ctrl = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.post("/", protect, ctrl.create);
router.get("/", protect, authorize("admin"), ctrl.getAll);
router.get("/:id", protect, ctrl.getById);
router.put("/:id", protect, authorize("admin"), ctrl.update);
router.delete("/:id", protect, authorize("admin"), ctrl.remove);

module.exports = router;