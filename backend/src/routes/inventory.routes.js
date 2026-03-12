const router = require("express").Router();
const ctrl = require("../controllers/inventory.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.post("/", protect, authorize("admin"), ctrl.create);
router.get("/", protect, authorize("admin"), ctrl.getAll);
router.get("/:id", protect, authorize("admin"), ctrl.getById);
router.put("/:id", protect, authorize("admin"), ctrl.update);
router.delete("/:id", protect, authorize("admin"), ctrl.remove);

module.exports = router;