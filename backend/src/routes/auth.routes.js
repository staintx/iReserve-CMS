const router = require("express").Router();
const authCtrl = require("../controllers/auth.controller");
const validate = require("../middleware/validate.middleware");
const { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema } = require("../validations/auth.validation");

router.post("/register", validate(registerSchema), authCtrl.register);
router.post("/login", validate(loginSchema), authCtrl.login);
router.get("/verify-email", authCtrl.verifyEmail);
router.post("/verify-otp", validate(verifyOtpSchema), authCtrl.verifyOtp);
router.post("/resend-otp", validate(resendOtpSchema), authCtrl.resendOtp);

module.exports = router;