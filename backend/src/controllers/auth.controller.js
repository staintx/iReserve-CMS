const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail, wrapHtml } = require("../utils/email");

const buildVerifyLink = (req, token) => {
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
  const baseUrl = process.env.FRONTEND_URL || origin || "http://localhost:5173";
  return `${baseUrl}/verify-email?token=${token}`;
};

const sanitizeUser = (user) => {
  const data = user.toObject();
  delete data.password;
  delete data.email_verify_token;
  delete data.email_verify_expires;
  delete data.email_otp_hash;
  delete data.email_otp_expires;
  return data;
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashToken = (value) => crypto.createHash("sha256").update(value).digest("hex");

exports.register = async (req, res, next) => {
  try {
    const { first_name, last_name, full_name, email, password } = req.body;

    // Accepts either shape. New clients send first/last; anything still
    // posting a single full_name (an older cached bundle, an integration)
    // keeps working and gets split by the model's pre-save hook.
    const firstName = (first_name || "").trim();
    const lastName = (last_name || "").trim();
    if (!firstName && !String(full_name || "").trim()) {
      return res.status(400).json({ message: "First name is required." });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "This email address is already registered. Please sign in or use a different email." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const otp = generateOtp();
    const otpHash = hashToken(otp);

    const user = await User.create({
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      full_name,
      email,
      password: hashed,
      role: "customer",
      is_verified: false,
      email_verify_token: tokenHash,
      email_verify_expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      email_otp_hash: otpHash,
      email_otp_expires: new Date(Date.now() + 10 * 60 * 1000)
    });

    const verifyLink = buildVerifyLink(req, rawToken);
    let emailSent = true;

    try {
      const bodyContent = `
        <h2>Welcome to Caezelle's! 🎉</h2>
        <p style="text-align: center; color: #475569;">Thank you for creating an account with us. Please use the verification code below to activate your account:</p>
        
        <div class="otp-card">
          <div class="otp-label">Your Verification Code</div>
          <div class="otp-code">${otp}</div>
          <div class="otp-note">Valid for 10 minutes &bull; Enter this in the verification screen</div>
        </div>

        <p style="text-align: center; color: #64748B; font-size: 13.5px; margin-top: 20px;">You can also verify instantly by clicking the button below:</p>
        <div class="btn-container">
          <a href="${verifyLink}" class="btn">Verify Email Address</a>
        </div>

        <p style="text-align: center; color: #94A3B8; font-size: 12px; margin-top: 15px;">
          If you didn't create an account with Caezelle's Catering, you can safely ignore this email.
        </p>
      `;

      await sendEmail({
        to: email,
        subject: "Verify your email | Caezelle's Catering",
        text: `Your verification code is ${otp}. You can also verify here: ${verifyLink}`,
        html: wrapHtml("Email Verification", bodyContent)
      });
    } catch (emailErr) {
      emailSent = false;
      console.error("Email send failed:", emailErr.message);
    }

    const response = {
      message: emailSent
        ? "Registration successful. Please verify your email."
        : "Registration successful, but verification email failed to send.",
      user: sanitizeUser(user)
    };

    if (!emailSent) {
      response.verify_link = verifyLink;
      response.otp = otp;
    }

    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: email }, { username: email }]
    });
    if (!user) return res.status(400).json({ message: "Invalid email or password." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid email or password." });

    if (user.role === "customer" && !user.is_verified) {
      return res.status(403).json({ message: "Please verify your email before logging in" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Account is disabled" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1d" });
    
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // Also return token in response body so clients that cannot read httpOnly
    // cookie (e.g. socket handshake auth fallbacks) can still include it.
    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.json({ message: "Logged out successfully" });
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Missing token" });

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      email_verify_token: tokenHash,
      email_verify_expires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.is_verified = true;
    user.email_verify_token = undefined;
    user.email_verify_expires = undefined;
    user.email_otp_hash = undefined;
    user.email_otp_expires = undefined;
    await user.save();

    res.json({ message: "Email verified. You may now log in." });
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.is_verified) {
      return res.json({ message: "Email already verified." });
    }

    if (!user.email_otp_hash || !user.email_otp_expires || user.email_otp_expires < new Date()) {
      return res.status(400).json({ message: "OTP expired. Please request a new code." });
    }

    const cleanOtp = otp.trim();
    const otpHash = hashToken(cleanOtp);
    if (otpHash !== user.email_otp_hash) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.is_verified = true;
    user.email_verify_token = undefined;
    user.email_verify_expires = undefined;
    user.email_otp_hash = undefined;
    user.email_otp_expires = undefined;
    await user.save();

    res.json({ message: "Email verified. You may now log in." });
  } catch (err) {
    next(err);
  }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.is_verified) {
      return res.json({ message: "Email already verified." });
    }

    const otp = generateOtp();
    user.email_otp_hash = hashToken(otp);
    user.email_otp_expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    let emailSent = true;
    try {
      const bodyContent = `
        <h2>Your Verification Code 🔐</h2>
        <p style="text-align: center; color: #475569;">You requested a new verification code for your Caezelle's Catering account:</p>
        
        <div class="otp-card">
          <div class="otp-label">New Verification Code</div>
          <div class="otp-code">${otp}</div>
          <div class="otp-note">Valid for 10 minutes &bull; Enter this in the verification screen</div>
        </div>

        <p style="text-align: center; color: #94A3B8; font-size: 12px; margin-top: 20px;">
          If you did not request this code, please secure your account or contact our support.
        </p>
      `;

      await sendEmail({
        to: email,
        subject: "Your verification code | Caezelle's Catering",
        text: `Your verification code is ${otp}.`,
        html: wrapHtml("Verification Code", bodyContent)
      });
    } catch (emailErr) {
      emailSent = false;
      console.error("Email send failed:", emailErr.message);
    }

    const response = {
      message: emailSent ? "OTP sent." : "OTP generated, but email failed to send."
    };

    if (!emailSent) {
      response.otp = otp;
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
};

const buildResetLink = (req, token) => {
  const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
  const baseUrl = process.env.FRONTEND_URL || origin || "http://localhost:5173";
  return `${baseUrl}/reset-password?token=${token}`;
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // Return success even if not found to prevent email enumeration
      return res.json({ message: "If that email address is in our database, we will send you an email to reset your password." });
    }

    // Prevent spam by ensuring a user can only request one reset link every 2 minutes.
    // Since we set expiry to 60 mins in the future, > 58 mins means it was requested < 2 mins ago.
    if (user.reset_password_expires && user.reset_password_expires.getTime() > Date.now() + 58 * 60 * 1000) {
      return res.status(429).json({ message: "Please wait a couple of minutes before requesting another reset link." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    user.reset_password_token = tokenHash;
    user.reset_password_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetLink = buildResetLink(req, rawToken);

    try {
      const bodyContent = `
        <h2>Reset Your Password 🔑</h2>
        <p style="text-align: center; color: #475569;">We received a request to reset the password associated with your Caezelle's Catering account.</p>
        
        <div class="btn-container">
          <a href="${resetLink}" class="btn">Reset My Password</a>
        </div>

        <div class="warning">
          <strong>Security Notice:</strong>
          <p style="margin: 4px 0 0; font-size: 13px;">This link will expire in 1 hour and can only be used once. If you did not request a password reset, no changes have been made and you can safely ignore this email.</p>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: "Reset your password | Caezelle's Catering",
        text: `You requested a password reset. Please click the link to reset your password: ${resetLink}`,
        html: wrapHtml("Reset Password", bodyContent)
      });
    } catch (emailErr) {
      console.error("Email send failed:", emailErr.message);
      // We don't fail the request here, but ideally we should let the user know,
      // or at least not expose the fact that email sending failed in a way that allows enumeration.
    }

    res.json({ message: "If that email address is in our database, we will send you an email to reset your password." });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      reset_password_token: tokenHash,
      reset_password_expires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save();

    res.json({ message: "Password reset successful. You may now log in." });
  } catch (err) {
    next(err);
  }
};