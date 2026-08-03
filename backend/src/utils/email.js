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

module.exports = {
  sendEmail,
  verifyEmailConnection,
};
