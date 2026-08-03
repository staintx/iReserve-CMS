const nodemailer = require("nodemailer");

const getBrevoTransport = () => {
  const host = process.env.BREVO_SMTP_HOST;
  // Render and many cloud providers block ports 25, 465, and 587 to prevent spam.
  // Port 2525 is typically left open for this exact reason.
  const port = Number(process.env.BREVO_SMTP_PORT || 2525);
  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASS;
  const from = process.env.MAIL_FROM;

  if (!host || !user || !pass || !from) {
    throw new Error("Brevo not configured: set BREVO_SMTP_HOST, BREVO_SMTP_USER, BREVO_SMTP_PASS, MAIL_FROM");
  }

  const transportOpts = {
    host,
    port,
    auth: { user, pass },
    connectionTimeout: 10000, // 10s to establish connection
    greetingTimeout: 10000,   // 10s for server greeting
    socketTimeout: 15000      // 15s for socket inactivity
  };

  // Port 465 uses implicit TLS (secure: true).
  // Ports 587 and 2525 use STARTTLS (secure: false, the default).
  // Explicitly setting this avoids ambiguity on cloud hosts.
  if (port === 465) {
    transportOpts.secure = true;
  } else {
    transportOpts.secure = false;
  }

  return {
    transporter: nodemailer.createTransport(transportOpts),
    from
  };
};

const sendEmail = async ({ to, subject, text, html }) => {
  const provider = process.env.MAIL_PROVIDER || "brevo";

  if (provider !== "brevo") {
    throw new Error(`Unsupported mail provider: ${provider}`);
  }

  const { transporter, from } = getBrevoTransport();

  console.log(`[Email] Sending to ${to} via ${process.env.BREVO_SMTP_HOST}:${process.env.BREVO_SMTP_PORT || 2525}`);

  try {
    const info = await transporter.sendMail({
      to,
      from,
      subject,
      text,
      html
    });
    console.log(`[Email] Sent successfully. MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}. Error: ${err.message}`);
    if (err.responseCode) console.error(`[Email] SMTP response code: ${err.responseCode}`);
    if (err.code) console.error(`[Email] Error code: ${err.code}`);
    throw err;
  }
};

/**
 * Call this once at server startup to verify the SMTP connection is reachable.
 * Logs success/failure — does NOT throw so the server still starts.
 */
const verifyEmailConnection = async () => {
  try {
    const { transporter } = getBrevoTransport();
    await transporter.verify();
    console.log("[Email] SMTP connection verified successfully");
  } catch (err) {
    console.error("[Email] SMTP connection verification FAILED:", err.message);
    if (err.code) console.error("[Email] Error code:", err.code);
  }
};

module.exports = {
  sendEmail,
  verifyEmailConnection
};
