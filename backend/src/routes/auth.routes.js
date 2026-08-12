const router = require("express").Router();
const authCtrl = require("../controllers/auth.controller");
const validate = require("../middleware/validate.middleware");
const { registerSchema, loginSchema, verifyOtpSchema, resendOtpSchema, forgotPasswordSchema, resetPasswordSchema } = require("../validations/auth.validation");
const { turnstileMiddleware } = require("../middleware/turnstile.middleware");

router.post("/register", turnstileMiddleware, validate(registerSchema), authCtrl.register);
router.post("/login", turnstileMiddleware, validate(loginSchema), authCtrl.login);
router.post("/logout", authCtrl.logout);
router.get("/verify-email", authCtrl.verifyEmail);
router.post("/verify-otp", validate(verifyOtpSchema), authCtrl.verifyOtp);
router.post("/resend-otp", validate(resendOtpSchema), authCtrl.resendOtp);
router.post("/forgot-password", turnstileMiddleware, validate(forgotPasswordSchema), authCtrl.forgotPassword);
router.post("/reset-password", turnstileMiddleware, validate(resetPasswordSchema), authCtrl.resetPassword);

module.exports = router;