const router = require("express").Router();
const ctrl = require("../controllers/inquiry.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { inquirySchema, inquiryUpdateSchema } = require("../validations/inquiry.validation");

router.post("/", protect, validate(inquirySchema), ctrl.create);
router.get("/", protect, authorize("admin"), ctrl.getAll);
router.get("/me", protect, ctrl.getMine);
router.get("/:id", protect, ctrl.getById);
router.put("/:id", protect, authorize("admin"), validate(inquiryUpdateSchema), ctrl.update);
router.delete("/:id", protect, authorize("admin"), ctrl.remove);

module.exports = router;