const router = require("express").Router();
const ctrl = require("../controllers/booking.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.post("/", protect, authorize("admin", "manager"), ctrl.create);
router.get("/", protect, authorize("admin"), ctrl.getAll);
router.get("/:id", protect, ctrl.getById);
router.put("/:id", protect, authorize("admin", "manager"), ctrl.update);
router.delete("/:id", protect, authorize("admin"), ctrl.remove);

module.exports = router;