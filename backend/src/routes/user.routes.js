const router = require("express").Router();
const ctrl = require("../controllers/user.controller");
const validate = require("../middleware/validate.middleware");
const { updateUserSchema, changePasswordSchema } = require("../validations/user.validation");
const { protect } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/role.middleware");

router.get("/customers", protect, authorize("admin"), ctrl.getCustomers);
router.put("/:id/status", protect, authorize("admin"), ctrl.updateStatus);
router.get("/me", protect, ctrl.getMe);
router.put("/me", protect, validate(updateUserSchema), ctrl.updateMe);
router.put("/me/password", protect, validate(changePasswordSchema), ctrl.changePassword);

module.exports = router;