const nodemailer = require("nodemailer");

const getBrevoTransport = () => {
  const host = process.env.BREVO_SMTP_HOST;
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
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
