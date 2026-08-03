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

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    }),
    from
  };
};

const sendEmail = async ({ to, subject, text, html }) => {
  const provider = process.env.MAIL_PROVIDER || "brevo";

  if (provider !== "brevo") {
    throw new Error(`Unsupported mail provider: ${provider}`);
  }

  const { transporter, from } = getBrevoTransport();

  await transporter.sendMail({
    to,
    from,
    subject,
    text,
    html
  });
};

module.exports = {
  sendEmail
};
