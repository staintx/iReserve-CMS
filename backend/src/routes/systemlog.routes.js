const router = require("express").Router();
const ctrl = require("../controllers/systemlog.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.post("/", protect, authorize("admin"), ctrl.create);
router.get("/", protect, authorize("admin"), ctrl.getAll);

module.exports = router;