const router = require("express").Router();
const ctrl = require("../controllers/user.controller");
const validate = require("../middleware/validate.middleware");
const { updateUserSchema } = require("../validations/user.validation");
const { protect } = require("../middleware/auth.middleware");

router.get("/me", protect, ctrl.getMe);
router.put("/me", protect, validate(updateUserSchema), ctrl.updateMe);

module.exports = router;