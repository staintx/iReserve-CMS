const router = require("express").Router();
const ctrl = require("../controllers/businessinfo.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const multer = require("multer");

const uploadPolicy = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});

router.get("/public", ctrl.getPublic);
router.get("/", protect, authorize("admin"), ctrl.get);
router.put("/", protect, authorize("admin"), ctrl.update);
router.post("/upload-policy", protect, authorize("admin"), uploadPolicy.single("file"), ctrl.uploadPolicyFile);

module.exports = router;

