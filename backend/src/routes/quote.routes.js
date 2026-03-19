const router = require("express").Router();
const ctrl = require("../controllers/quote.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { quoteSchema, quoteUpdateSchema } = require("../validations/quote.validation");

router.post("/", protect, validate(quoteSchema), ctrl.create);
router.get("/", protect, authorize("admin", "manager"), ctrl.getAll);
router.get("/me", protect, ctrl.getMine);
router.get("/:id", protect, authorize("admin", "manager"), ctrl.getById);
router.put("/:id", protect, authorize("admin", "manager"), validate(quoteUpdateSchema), ctrl.update);
router.delete("/:id", protect, authorize("admin"), ctrl.remove);

module.exports = router;
