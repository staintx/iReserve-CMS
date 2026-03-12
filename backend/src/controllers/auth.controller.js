const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail } = require("../utils/email");

const buildVerifyLink = (token) => {
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
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
    const { full_name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const otp = generateOtp();
    const otpHash = hashToken(otp);

    const user = await User.create({
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

    const verifyLink = buildVerifyLink(rawToken);
    let emailSent = true;

    try {
      await sendEmail({
        to: email,
        subject: "Verify your email",
        text: `Your verification code is ${otp}. You can also verify here: ${verifyLink}`,
        html: `<p>Your verification code is <strong>${otp}</strong>.</p><p>You can also verify here:</p><p><a href="${verifyLink}">${verifyLink}</a></p>`
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
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    if (user.role === "customer" && !user.is_verified) {
      return res.status(403).json({ message: "Please verify your email before logging in" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Account is disabled" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
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

    const otpHash = hashToken(otp);
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
      await sendEmail({
        to: email,
        subject: "Your verification code",
        text: `Your verification code is ${otp}.`,
        html: `<p>Your verification code is <strong>${otp}</strong>.</p>`
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