const { sendEmail } = require("./email");

const formatCurrency = (value) => {
	const num = Number(value);
	if (!Number.isFinite(num)) return "₱0";
	return `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (value) => {
	if (!value) return "TBD";
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? "TBD" : d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
};

const wrapHtml = (title, bodyContent) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6f9; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 32px 24px; text-align: center; }
  .header h1 { margin: 0 0 4px; font-size: 1.5rem; }
  .header p { margin: 0; opacity: 0.8; font-size: 0.9rem; }
  .body { padding: 24px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
  .info-item { background: #f8fafc; padding: 12px; border-radius: 8px; }
  .info-item label { display: block; font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; }
  .info-item span { font-size: 0.95rem; color: #0f172a; font-weight: 500; }
  .highlight { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center; }
  .highlight .amount { font-size: 1.5rem; font-weight: 700; color: #16a34a; }
  .warning { background: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 8px; margin: 16px 0; }
  .btn { display: inline-block; background: #1a1a2e; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
  .footer { padding: 20px 24px; text-align: center; font-size: 0.8rem; color: #94a3b8; border-top: 1px solid #f1f5f9; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Caezelle's Catering</h1>
    <p>${title}</p>
  </div>
  <div class="body">
    ${bodyContent}
  </div>
  <div class="footer">
    <p>This is an automated email from iReserve by Caezelle's Catering.</p>
    <p>If you have questions, reply to this email or message us through the app.</p>
  </div>
</div>
</body>
</html>`;

const sendBookingConfirmationEmail = async ({ booking, customerEmail }) => {
	if (!customerEmail) return;

	const bodyContent = `
    <h2>Booking Confirmed! 🎉</h2>
    <p>Thank you for choosing Caezelle's Catering. Your booking has been received and is now pending your deposit payment.</p>
    
    <div class="info-grid">
      <div class="info-item">
        <label>Reference</label>
        <span>${booking.reference || booking._id}</span>
      </div>
      <div class="info-item">
        <label>Event Type</label>
        <span>${booking.event_type || "Event"}</span>
      </div>
      <div class="info-item">
        <label>Event Date</label>
        <span>${formatDate(booking.event_date)}</span>
      </div>
      <div class="info-item">
        <label>Start Time</label>
        <span>${booking.start_time || "TBD"}</span>
      </div>
      <div class="info-item">
        <label>Guest Count</label>
        <span>${booking.guest_count || "TBD"}</span>
      </div>
      <div class="info-item">
        <label>Venue</label>
        <span>${booking.venue_type || "TBD"}</span>
      </div>
    </div>

    <div class="highlight">
      <p style="margin:0 0 4px; font-size:0.85rem; color:#64748b;">Total Package Price</p>
      <div class="amount">${formatCurrency(booking.total_price)}</div>
    </div>

    <p><strong>Next Steps:</strong></p>
    <ol>
      <li>Pay your deposit to confirm the booking</li>
      <li>An ocular visit will be scheduled to inspect the venue</li>
      <li>Remaining balance is due 3 days before the event</li>
    </ol>

    <p style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/customer/bookings" class="btn">View My Bookings</a>
    </p>
  `;

	try {
		await sendEmail({
			to: customerEmail,
			subject: `Booking Confirmed — ${booking.reference || booking._id} | Caezelle's Catering`,
			html: wrapHtml("Booking Confirmation", bodyContent),
			text: `Your booking ${booking.reference || booking._id} for ${booking.event_type || "event"} on ${formatDate(booking.event_date)} has been confirmed. Total: ${formatCurrency(booking.total_price)}.`
		});
	} catch (err) {
		console.error("Failed to send booking confirmation email:", err.message);
	}
};

const sendPaymentReceiptEmail = async ({ payment, booking, customerEmail }) => {
	if (!customerEmail) return;

	const bodyContent = `
    <h2>Payment Received ✅</h2>
    <p>We have received your payment. Here are the details:</p>
    
    <div class="info-grid">
      <div class="info-item">
        <label>Booking Reference</label>
        <span>${booking?.reference || booking?._id || "N/A"}</span>
      </div>
      <div class="info-item">
        <label>Payment Type</label>
        <span>${(payment.payment_type || "payment").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
      </div>
      <div class="info-item">
        <label>Amount Paid</label>
        <span>${formatCurrency(payment.amount)}</span>
      </div>
      <div class="info-item">
        <label>Payment Method</label>
        <span>${(payment.method || "Online").toUpperCase()}</span>
      </div>
    </div>

    <div class="highlight">
      <p style="margin:0 0 4px; font-size:0.85rem; color:#64748b;">Amount Paid</p>
      <div class="amount">${formatCurrency(payment.amount)}</div>
    </div>

    <p style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/customer/payments" class="btn">View Payment History</a>
    </p>
  `;

	try {
		await sendEmail({
			to: customerEmail,
			subject: `Payment Receipt — ${formatCurrency(payment.amount)} | Caezelle's Catering`,
			html: wrapHtml("Payment Receipt", bodyContent),
			text: `Payment of ${formatCurrency(payment.amount)} received for booking ${booking?.reference || booking?._id || "N/A"}.`
		});
	} catch (err) {
		console.error("Failed to send payment receipt email:", err.message);
	}
};

const sendFinalInvoiceEmail = async ({ booking, balance, checkoutUrl, customerEmail }) => {
	if (!customerEmail) return;

	const bodyContent = `
    <h2>Final Payment Due ⏰</h2>

    <div class="warning">
      <strong>Your event is in 3 days!</strong>
      <p style="margin:8px 0 0;">Please pay the remaining balance to finalize your booking.</p>
    </div>
    
    <div class="info-grid">
      <div class="info-item">
        <label>Booking Reference</label>
        <span>${booking.reference || booking._id}</span>
      </div>
      <div class="info-item">
        <label>Event Date</label>
        <span>${formatDate(booking.event_date)}</span>
      </div>
      <div class="info-item">
        <label>Total Cost</label>
        <span>${formatCurrency(booking.total_price)}</span>
      </div>
      <div class="info-item">
        <label>Remaining Balance</label>
        <span style="color:#dc2626; font-weight:700;">${formatCurrency(balance)}</span>
      </div>
    </div>

    <p style="text-align:center;">
      <a href="${checkoutUrl || `${process.env.FRONTEND_URL || "http://localhost:5173"}/customer/payments`}" class="btn">Pay Now — ${formatCurrency(balance)}</a>
    </p>

    <p style="font-size:0.85rem; color:#64748b; text-align:center;">
      Failure to pay on time may affect your booking status.
    </p>
  `;

	try {
		await sendEmail({
			to: customerEmail,
			subject: `Final Payment Due — ${formatCurrency(balance)} | ${booking.reference || booking._id}`,
			html: wrapHtml("Final Invoice", bodyContent),
			text: `Your event is in 3 days. Please pay the remaining balance of ${formatCurrency(balance)} for booking ${booking.reference || booking._id}.`
		});
	} catch (err) {
		console.error("Failed to send final invoice email:", err.message);
	}
};

const sendBookingStatusEmail = async ({ booking, newStatus, customerEmail }) => {
	if (!customerEmail) return;

	const statusMessages = {
		confirmed: "Your booking has been confirmed! We're excited to make your event special.",
		preparing: "We've started preparing for your event. Everything is on track!",
		ongoing: "Your event is happening today! We hope everything is perfect.",
		completed: "Your event has been completed. Thank you for choosing Caezelle's Catering! We'd love to hear your feedback.",
		cancelled: "Your booking has been cancelled. If you have questions about refunds, please contact us."
	};

	const bodyContent = `
    <h2>Booking Status Update</h2>
    <p>${statusMessages[newStatus] || `Your booking status has been updated to: ${newStatus}`}</p>
    
    <div class="info-grid">
      <div class="info-item">
        <label>Reference</label>
        <span>${booking.reference || booking._id}</span>
      </div>
      <div class="info-item">
        <label>New Status</label>
        <span style="text-transform:capitalize; font-weight:700;">${newStatus}</span>
      </div>
      <div class="info-item">
        <label>Event Type</label>
        <span>${booking.event_type || "Event"}</span>
      </div>
      <div class="info-item">
        <label>Event Date</label>
        <span>${formatDate(booking.event_date)}</span>
      </div>
    </div>

    <p style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/customer/bookings" class="btn">View My Bookings</a>
    </p>
  `;

	try {
		await sendEmail({
			to: customerEmail,
			subject: `Booking ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)} — ${booking.reference || booking._id}`,
			html: wrapHtml("Booking Update", bodyContent),
			text: `Your booking ${booking.reference || booking._id} status has been updated to: ${newStatus}.`
		});
	} catch (err) {
		console.error("Failed to send booking status email:", err.message);
	}
};

module.exports = {
	sendBookingConfirmationEmail,
	sendPaymentReceiptEmail,
	sendFinalInvoiceEmail,
	sendBookingStatusEmail
};
