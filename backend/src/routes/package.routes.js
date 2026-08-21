const router = require("express").Router();
const ctrl = require("../controllers/package.controller");
const upload = require("../middleware/upload.middleware");
const { protect, optionalProtect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { packageSchema, packageUpdateSchema } = require("../validations/package.validation");

const uploadFields = upload.fields([{ name: "image", maxCount: 1 }, { name: "gallery", maxCount: 10 }]);

router.post("/ai-parse", protect, authorize("admin"), upload.single("file"), ctrl.parseWithAI);
router.post("/bulk", protect, authorize("admin"), ctrl.createBulk);
router.post("/", protect, authorize("admin"), uploadFields, validate(packageSchema), ctrl.create);
router.get("/", optionalProtect, ctrl.getAll);
router.get("/:id", optionalProtect, ctrl.getById);
router.put("/:id", protect, authorize("admin"), uploadFields, validate(packageUpdateSchema), ctrl.update);
router.delete("/:id", protect, authorize("admin"), ctrl.remove);

module.exports = router;