const router = require("express").Router();
const ctrl = require("../controllers/report.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.get("/summary", protect, authorize("admin"), ctrl.dashboardSummary);
router.get("/metrics", protect, authorize("admin"), ctrl.dashboardMetrics);

module.exports = router;