const router = require("express").Router();
const ctrl = require("../controllers/package.controller");
const upload = require("../middleware/upload.middleware");
const { protect, optionalProtect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { packageSchema, packageUpdateSchema } = require("../validations/package.validation");

router.post("/", protect, authorize("admin"), upload.single("image"), validate(packageSchema), ctrl.create);
router.get("/", optionalProtect, ctrl.getAll);
router.get("/:id", optionalProtect, ctrl.getById);
router.put("/:id", protect, authorize("admin"), upload.single("image"), validate(packageUpdateSchema), ctrl.update);
router.delete("/:id", protect, authorize("admin"), ctrl.remove);

module.exports = router;