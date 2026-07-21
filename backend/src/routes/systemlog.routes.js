const router = require("express").Router();
const ctrl = require("../controllers/systemlog.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.get("/", protect, authorize("admin", "manager"), ctrl.getAll);
router.post("/", protect, authorize("admin"), ctrl.create);

module.exports = router;