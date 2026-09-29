const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Rating = require("../models/Rating");
const asyncHandler = require("../utils/asyncHandler");
const bcrypt = require("bcryptjs");

const VIP_SPENDING_THRESHOLD = 100000;

const crypto = require("crypto");
const { sendEmail, wrapHtml } = require("../utils/email");

const logAction = require("../utils/logAction");

const hashToken = (value) => crypto.createHash("sha256").update(value).digest("hex");
const generateCryptoOtp = () => String(crypto.randomInt(100000, 1000000));

const maskEmail = (email) => {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(1, local.length - 2))}${local.slice(-1)}@${domain}`;
};

exports.getMe = asyncHandler(async (req, res) => {
  const token = req.cookies?.token || (req.headers.authorization ? req.headers.authorization.split(" ")[1] : null);
  const userData = req.user.toObject ? req.user.toObject() : { ...req.user };
  delete userData.password;
  delete userData.profile_otp_hash;
  delete userData.profile_otp_expires;
  delete userData.profile_otp_attempts;
  delete userData.profile_otp_last_sent_at;
  delete userData.email_otp_hash;
  delete userData.email_otp_expires;
  delete userData.reset_password_token;
  delete userData.reset_password_expires;
  res.json({ ...userData, token });
});

exports.requestProfileOtp = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // 60-second cooldown enforcement
  if (user.profile_otp_last_sent_at) {
    const elapsedSeconds = (Date.now() - new Date(user.profile_otp_last_sent_at).getTime()) / 1000;
    if (elapsedSeconds < 60) {
      const waitSeconds = Math.ceil(60 - elapsedSeconds);
      return res.status(429).json({
        message: `Please wait ${waitSeconds}s before requesting another verification code.`,
        cooldown_remaining: waitSeconds
      });
    }
  }

  const otp = generateCryptoOtp();
  const otpHash = hashToken(otp);

  user.profile_otp_hash = otpHash;
  user.profile_otp_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  user.profile_otp_attempts = 0;
  user.profile_otp_last_sent_at = new Date();
  await user.save();

  // Send branded email to user's CURRENT registered email
  let emailSent = true;
  try {
    const roleLabel = (user.role || "user").toUpperCase();
    const bodyContent = `
      <h2>Security Verification Code 🔐</h2>
      <p style="text-align: center; color: #475569;">
        A request was made to update profile details on your <strong>Caezelle's Catering</strong> account (${roleLabel}).
      </p>
      <div class="otp-card">
        <div class="otp-label">Two-Factor Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-note">Valid for 10 minutes &bull; Never share this code with anyone</div>
      </div>
      <p style="text-align: center; color: #94A3B8; font-size: 12px; margin-top: 15px;">
        If you did not initiate this profile update, please change your password immediately to protect your account.
      </p>
    `;

    await sendEmail({
      to: user.email,
      subject: "Security Verification Code | Caezelle's Catering",
      text: `Your security verification code is ${otp}. Valid for 10 minutes.`,
      html: wrapHtml("Security Verification", bodyContent)
    });
  } catch (emailErr) {
    emailSent = false;
    console.error("Failed to send profile update OTP email:", emailErr.message);
  }

  res.json({
    success: true,
    message: emailSent
      ? "Verification code sent to your email."
      : "Failed to deliver code via email. Please check your connection and try again.",
    masked_email: maskEmail(user.email),
    cooldown_seconds: 60
  });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ message: "Verification code is required to save changes." });
  }

  // 1. Verify OTP presence & expiry
  if (!user.profile_otp_hash || !user.profile_otp_expires || user.profile_otp_expires < new Date()) {
    return res.status(400).json({ message: "Verification code has expired or is invalid. Please request a new code." });
  }

  // 2. Enforce max 5 attempts
  user.profile_otp_attempts = (user.profile_otp_attempts || 0) + 1;
  if (user.profile_otp_attempts > 5) {
    user.profile_otp_hash = undefined;
    user.profile_otp_expires = undefined;
    user.profile_otp_attempts = 0;
    await user.save();
    return res.status(429).json({ message: "Too many failed attempts. This code has been invalidated. Please request a new code." });
  }

  // 3. Verify OTP Hash
  const cleanOtp = String(otp || "").trim();
  const otpHash = hashToken(cleanOtp);
  if (otpHash !== user.profile_otp_hash) {
    await user.save();
    const remaining = Math.max(0, 5 - user.profile_otp_attempts);
    return res.status(400).json({ message: `Invalid verification code. ${remaining} attempt(s) remaining.` });
  }

  // OTP verified successfully - clear OTP state
  user.profile_otp_hash = undefined;
  user.profile_otp_expires = undefined;
  user.profile_otp_attempts = 0;

  let emailChanged = false;
  let oldEmail = user.email;
  let newEmail = null;

  if (req.body.email) {
    const emailToTest = req.body.email.trim().toLowerCase();
    if (emailToTest !== user.email?.toLowerCase()) {
      const existing = await User.findOne({ email: emailToTest, _id: { $ne: user._id } });
      if (existing) {
        await user.save();
        return res.status(409).json({ message: "Email already in use" });
      }
      emailChanged = true;
      newEmail = emailToTest;
    }
  }

  if (req.body.username) {
    const usernameToTest = req.body.username.trim();
    if (usernameToTest !== user.username) {
      const existingUser = await User.findOne({ username: usernameToTest, _id: { $ne: user._id } });
      if (existingUser) {
        await user.save();
        return res.status(409).json({ message: "Username already in use" });
      }
    }
  }

  // Name updates keep both representations in step.
  const firstName = req.body.first_name !== undefined ? String(req.body.first_name).trim() : null;
  const lastName = req.body.last_name !== undefined ? String(req.body.last_name).trim() : null;

  if (firstName !== null || lastName !== null) {
    const nextFirst = firstName !== null ? firstName : user.first_name || "";
    const nextLast = lastName !== null ? lastName : user.last_name || "";
    user.first_name = nextFirst;
    user.last_name = nextLast;
    user.full_name = [nextFirst, nextLast].filter(Boolean).join(" ");
  } else if (req.body.full_name) {
    const full = req.body.full_name.trim();
    const parts = full.split(/\s+/);
    user.full_name = full;
    user.first_name = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
    user.last_name = parts.length > 1 ? parts[parts.length - 1] : "";
  }

  if (req.body.email && emailChanged) {
    user.email = newEmail;
  }
  if (req.body.phone !== undefined) {
    user.phone = req.body.phone ? req.body.phone.trim() : "";
  }
  if (req.body.alt_phone !== undefined) {
    user.alt_phone = req.body.alt_phone ? req.body.alt_phone.trim() : "";
  }
  if (req.body.address !== undefined) {
    user.address = req.body.address ? req.body.address.trim() : "";
  }
  if (req.body.position !== undefined) {
    user.position = req.body.position ? req.body.position.trim() : "";
  }
  if (req.body.username !== undefined) {
    user.username = req.body.username ? req.body.username.trim() : undefined;
  }

  await user.save();

  // If email was changed, send security notice to OLD email and welcome notice to NEW email
  if (emailChanged && oldEmail) {
    try {
      const securityAlertHtml = `
        <h2>Account Security Alert 🛡️</h2>
        <p style="text-align: center; color: #475569;">
          The email address for your Caezelle's Catering account was recently updated to:
        </p>
        <div style="text-align: center; font-size: 16px; font-weight: 700; color: #1E293B; margin: 15px 0;">
          ${newEmail}
        </div>
        <div class="warning">
          <strong>Did you authorize this change?</strong>
          <p style="margin: 4px 0 0; font-size: 13px;">
            If you did not authorize this change, someone may have compromised your account. Please contact customer support immediately.
          </p>
        </div>
      `;
      sendEmail({
        to: oldEmail,
        subject: "Security Alert: Email address changed | Caezelle's Catering",
        text: `Your account email was changed to ${newEmail}. If this wasn't you, please contact support immediately.`,
        html: wrapHtml("Security Notice", securityAlertHtml)
      }).catch((err) => console.error("Failed to send old email change alert:", err.message));

      const newEmailConfirmHtml = `
        <h2>Email Address Confirmed ✅</h2>
        <p style="text-align: center; color: #475569;">
          Your Caezelle's Catering account email address has been successfully updated to <strong>${newEmail}</strong>.
        </p>
      `;
      sendEmail({
        to: newEmail,
        subject: "Email address updated | Caezelle's Catering",
        text: `Your account email has been updated to ${newEmail}.`,
        html: wrapHtml("Email Updated", newEmailConfirmHtml)
      }).catch((err) => console.error("Failed to send new email confirm:", err.message));
    } catch (e) {
      console.error("Email notification error:", e.message);
    }
  }

  // Audit Log entry
  await logAction({
    user_id: user._id,
    action: "user_profile_updated",
    entity_type: "user",
    entity_id: user._id,
    details: `User (${user.role}) updated profile details with verified 2FA OTP.`,
    changes: {
      email_changed: emailChanged,
      old_email: emailChanged ? oldEmail : undefined,
      new_email: emailChanged ? newEmail : undefined
    },
    ip_address: req.ip
  });

  const userData = user.toObject();
  delete userData.password;
  delete userData.profile_otp_hash;
  delete userData.profile_otp_expires;
  delete userData.profile_otp_attempts;
  delete userData.profile_otp_last_sent_at;
  delete userData.email_otp_hash;
  delete userData.email_otp_expires;
  delete userData.reset_password_token;
  delete userData.reset_password_expires;

  res.json(userData);
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const match = await bcrypt.compare(req.body.current_password, user.password);
  if (!match) return res.status(400).json({ message: "Incorrect current password" });

  user.password = await bcrypt.hash(req.body.new_password, 10);
  await user.save();

  res.json({ message: "Password updated successfully" });
});

exports.getCustomers = asyncHandler(async (req, res) => {
  const customers = await User.find({ role: "customer" })
    .select("full_name email phone is_active createdAt")
    .lean();

  const customerIds = customers.map((c) => c._id);

  const [spendingByCustomer, bookingStatsByCustomer, ratingByCustomer] = await Promise.all([
    Payment.aggregate([
      { $match: { customer_id: { $in: customerIds }, status: "approved" } },
      { $group: { _id: "$customer_id", total: { $sum: "$amount" } } }
    ]),
    Booking.aggregate([
      { $match: { customer_id: { $in: customerIds } } },
      { $group: { _id: "$customer_id", count: { $sum: 1 }, lastBooking: { $max: "$event_date" } } }
    ]),
    Rating.aggregate([
      { $match: { customer_id: { $in: customerIds } } },
      { $group: { _id: "$customer_id", avg: { $avg: "$stars" } } }
    ])
  ]);

  const spendingMap = new Map(spendingByCustomer.map((s) => [String(s._id), s.total]));
  const bookingMap = new Map(bookingStatsByCustomer.map((b) => [String(b._id), b]));
  const ratingMap = new Map(ratingByCustomer.map((r) => [String(r._id), r.avg]));

  const enriched = customers.map((customer) => {
    const key = String(customer._id);
    const spending = spendingMap.get(key) || 0;
    const bookingStats = bookingMap.get(key);
    const reservations = bookingStats?.count || 0;
    const lastBooking = bookingStats?.lastBooking || null;
    const rating = ratingMap.has(key) ? Math.round(ratingMap.get(key)) : null;

    let tier = "Regular";
    if (reservations <= 1) tier = "New";
    else if (spending >= VIP_SPENDING_THRESHOLD) tier = "VIP";

    return {
      ...customer,
      spending,
      reservations,
      last_booking_date: lastBooking,
      rating,
      tier
    };
  });

  res.json(enriched);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { is_active: Boolean(req.body.is_active) },
    { returnDocument: 'after' }
  );
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});