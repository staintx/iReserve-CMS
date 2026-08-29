/**
 * Email utility – uses the Brevo Transactional Email HTTP API.
 *
 * This avoids SMTP ports (25/465/587/2525) which many cloud providers
 * (Render, Railway, Fly.io, etc.) block outright.  The HTTP API goes over
 * port 443 (HTTPS) which is always open.
 *
 * Required env vars:
 *   BREVO_API_KEY  – v3 API key from https://app.brevo.com/settings/keys/api
 *   MAIL_FROM      – verified sender email address
 */

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Send a transactional email via the Brevo HTTP API.
 *
 * @param {Object}  opts
 * @param {string}  opts.to       – recipient email address
 * @param {string}  opts.subject  – email subject
 * @param {string}  [opts.text]   – plain-text body
 * @param {string}  [opts.html]   – HTML body
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    throw new Error(
      "Brevo not configured: set BREVO_API_KEY and MAIL_FROM environment variables"
    );
  }

  const body = {
    sender: { email: from },
    to: [{ email: to }],
    subject,
  };

  if (html) body.htmlContent = html;
  if (text) body.textContent = text;

  console.log(`[Email] Sending to ${to} via Brevo HTTP API`);

  try {
    const res = await fetch(BREVO_SEND_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg = errorData.message || res.statusText;
      throw new Error(`Brevo API ${res.status}: ${msg}`);
    }

    const data = await res.json();
    console.log(`[Email] Sent successfully. MessageId: ${data.messageId}`);
    return data;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}. Error: ${err.message}`);
    throw err;
  }
};

/**
 * Call this once at server startup to verify the Brevo API key is valid.
 * Uses the /v3/account endpoint which costs nothing and confirms auth.
 * Logs success/failure — does NOT throw so the server still starts.
 */
const verifyEmailConnection = async () => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error("[Email] BREVO_API_KEY is not set — email will not work");
    return;
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        `Brevo API ${res.status}: ${errorData.message || res.statusText}`
      );
    }

    const account = await res.json();
    console.log(
      `[Email] Brevo API key verified — account: ${account.email}`
    );
  } catch (err) {
    console.error("[Email] Brevo API verification FAILED:", err.message);
  }
};

/**
 * Wrap HTML content in the Caezelle's Catering email layout matching the landing page aesthetic
 */
const wrapHtml = (title, bodyContent) => {
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");
  const logoUrl = `${frontendUrl}/logo.jpg`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  /* Reset */
  body, table, td, p, a, li, blockquote {
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  body {
    font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background-color: #F7F4EE;
    color: #1E293B;
    margin: 0 !important;
    padding: 30px 15px !important;
  }
  img {
    border: 0;
    height: auto;
    line-height: 100%;
    outline: none;
    text-decoration: none;
  }
  table {
    border-collapse: collapse !important;
  }

  /* Main Container */
  .email-container {
    max-width: 580px;
    margin: 0 auto;
    background-color: #FFFFFF;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(92, 64, 43, 0.08);
    border: 1px solid #E8E2D5;
  }

  /* Header */
  .email-header {
    background: #1E293B;
    background: linear-gradient(145deg, #1E293B 0%, #2C4B8A 60%, #152244 100%);
    color: #FFFFFF;
    padding: 34px 24px 28px 24px;
    text-align: center;
    border-bottom: 3px solid #C5A059;
  }
  .brand-logo-table {
    margin: 0 auto 12px auto;
  }
  .brand-logo-cell {
    width: 62px;
    height: 62px;
    border-radius: 50%;
    border: 2px solid #C5A059;
    background-color: #FFFFFF;
    padding: 2px;
    text-align: center;
    vertical-align: middle;
  }
  .brand-logo-img {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    object-fit: cover;
    display: block;
    margin: 0 auto;
  }
  .brand-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 0.5px;
    margin: 0;
    color: #FFFFFF;
    line-height: 1.2;
  }
  .brand-subtitle {
    font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: #D2B67C;
    margin: 4px 0 12px 0;
  }
  .gold-bar {
    width: 40px;
    height: 3px;
    background-color: #C5A059;
    margin: 0 auto 12px auto;
    border-radius: 2px;
  }
  .header-subject {
    font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
  }

  /* Body Content */
  .email-body {
    padding: 34px 28px;
    color: #334155;
    font-size: 15px;
    line-height: 1.65;
  }
  .email-body h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 22px;
    font-weight: 700;
    color: #1E293B;
    margin: 0 0 14px 0;
    text-align: center;
    line-height: 1.3;
  }
  .email-body p {
    margin: 0 0 14px 0;
    font-size: 14.5px;
  }

  /* OTP / Verification Box */
  .otp-card {
    background-color: #F8FAFC;
    border: 1.5px dashed #CBD5E1;
    border-radius: 12px;
    padding: 22px 18px;
    margin: 24px 0;
    text-align: center;
  }
  .otp-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #64748B;
    margin-bottom: 6px;
  }
  .otp-code {
    font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 36px;
    font-weight: 800;
    letter-spacing: 8px;
    color: #2C4B8A;
    line-height: 1.2;
    text-indent: 8px;
    margin: 4px 0 6px 0;
  }
  .otp-note {
    font-size: 12px;
    color: #94A3B8;
    margin: 0;
  }

  /* Call-to-action button */
  .btn-container {
    text-align: center;
    margin: 24px 0;
  }
  .btn {
    display: inline-block;
    background-color: #2C4B8A;
    color: #FFFFFF !important;
    padding: 13px 32px;
    border-radius: 10px;
    text-decoration: none;
    font-weight: 600;
    font-size: 14px;
    letter-spacing: 0.2px;
    box-shadow: 0 4px 12px rgba(44, 75, 138, 0.22);
    text-align: center;
  }

  /* Info Grid */
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 18px 0;
  }
  .info-item {
    background: #F8FAFC;
    border: 1px solid #E2E8F0;
    padding: 10px 12px;
    border-radius: 8px;
  }
  .info-item label {
    display: block;
    font-size: 10.5px;
    color: #64748B;
    text-transform: uppercase;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin-bottom: 3px;
  }
  .info-item span {
    font-size: 13.5px;
    color: #0F172A;
    font-weight: 600;
  }

  /* Highlights & Warnings */
  .highlight {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    padding: 16px;
    border-radius: 10px;
    margin: 18px 0;
    text-align: center;
  }
  .highlight .amount {
    font-size: 24px;
    font-weight: 700;
    color: #16A34A;
  }
  .warning {
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    padding: 14px 16px;
    border-radius: 10px;
    margin: 18px 0;
    color: #92400E;
    font-size: 13.5px;
  }

  /* Footer */
  .email-footer {
    padding: 24px 24px 20px 24px;
    text-align: center;
    font-size: 12px;
    color: #64748B;
    background-color: #F8FAFC;
    border-top: 1px solid #E2E8F0;
    line-height: 1.6;
  }
  .footer-brand {
    font-weight: 700;
    color: #1E293B;
    font-size: 12.5px;
    margin-bottom: 2px;
  }
  .footer-links a {
    color: #2C4B8A;
    text-decoration: underline;
  }

  @media only screen and (max-width: 480px) {
    .email-body { padding: 24px 16px !important; }
    .email-header { padding: 26px 14px 20px 14px !important; }
    .info-grid { grid-template-columns: 1fr !important; }
    .otp-code { font-size: 28px !important; letter-spacing: 5px !important; }
  }
</style>
</head>
<body>
<div class="email-container">
  <div class="email-header">
    <table border="0" cellpadding="0" cellspacing="0" class="brand-logo-table">
      <tr>
        <td class="brand-logo-cell">
          <img src="${logoUrl}" alt="Caezelle's" class="brand-logo-img" />
        </td>
      </tr>
    </table>
    <h1 class="brand-title">Caezelle's</h1>
    <div class="brand-subtitle">Food, Catering &amp; Services</div>
    <div class="gold-bar"></div>
    <p class="header-subject">${title}</p>
  </div>
  <div class="email-body">
    ${bodyContent}
  </div>
  <div class="email-footer">
    <div class="footer-brand">Caezelle's Food, Catering &amp; Services</div>
    <p style="margin: 0 0 8px 0;">Exceptional catering and memorable celebrations.</p>
    <p style="margin: 0 0 10px 0;" class="footer-links">
      <a href="${frontendUrl}">Visit Website</a> &bull;
      <a href="${frontendUrl}/customer/dashboard">Customer Portal</a>
    </p>
    <p style="margin: 0; color: #94A3B8; font-size: 11px;">
      This is an automated notification from iReserve.
      <br>&copy; 2026 Caezelle's Catering. All rights reserved.
    </p>
  </div>
</div>
</body>
</html>`;
};

module.exports = {
  sendEmail,
  verifyEmailConnection,
  wrapHtml,
};
