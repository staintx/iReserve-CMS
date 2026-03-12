const router = require("express").Router();
const ctrl = require("../controllers/menu.controller");
const upload = require("../middleware/upload.middleware");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { menuSchema } = require("../validations/menu.validation");

router.post("/", protect, authorize("admin"), upload.single("image"), validate(menuSchema), ctrl.create);
router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getById);
router.put("/:id", protect, authorize("admin"), upload.single("image"), validate(menuSchema), ctrl.update);
router.delete("/:id", protect, authorize("admin"), ctrl.remove);

module.exports = router;