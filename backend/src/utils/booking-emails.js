const { sendEmail, wrapHtml } = require("./email");
const User = require("../models/User");

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

/**
 * Resolves the customer's email address from a booking/inquiry doc or its customer_id relation.
 */
const resolveCustomerEmail = async (doc, fallbackDoc = null) => {
	const directEmail = doc?.contact_email || fallbackDoc?.contact_email;
	if (directEmail && String(directEmail).trim()) {
		return String(directEmail).trim();
	}
	const populatedEmail = doc?.customer_id?.email || fallbackDoc?.customer_id?.email;
	if (populatedEmail && String(populatedEmail).trim()) {
		return String(populatedEmail).trim();
	}
	const customerId = doc?.customer_id?._id || doc?.customer_id || fallbackDoc?.customer_id?._id || fallbackDoc?.customer_id;
	if (customerId) {
		try {
			const user = await User.findById(customerId).select("email").lean();
			if (user?.email && String(user.email).trim()) {
				return String(user.email).trim();
			}
		} catch { }
	}
	return null;
};

const sendInquiryStatusEmail = async ({ inquiry, newStatus, customerEmail, quotation = null, customMessage = null }) => {
	const email = customerEmail || (await resolveCustomerEmail(inquiry));
	if (!email) return;

	const normalizedStatus = String(newStatus || inquiry?.status || "Pending Review").trim();
	const statusKey = normalizedStatus.toLowerCase();

	const statusInfoMap = {
		"pending review": {
			title: "Inquiry Received",
			subjectStatus: "Received",
			message: "Thank you for reaching out to Caezelle's Catering! We have received your event inquiry and our team will review the details shortly.",
			badgeColor: "#2C4B8A"
		},
		"under review": {
			title: "Inquiry Under Review",
			subjectStatus: "Under Review",
			message: "Our catering specialists are actively reviewing your event requirements and preparing your proposal.",
			badgeColor: "#3B82F6"
		},
		"quotation sent": {
			title: "Quotation Ready",
			subjectStatus: "Quotation Ready",
			message: "A quotation has been prepared for your event! Please log in to your account to review the proposal, menu items, and pricing.",
			badgeColor: "#16A34A"
		},
		"revision requested": {
			title: "Revision Request Received",
			subjectStatus: "Revision Requested",
			message: "We received your revision request. Our team will adjust your quotation according to your notes and provide an updated proposal soon.",
			badgeColor: "#EAB308"
		},
		"quote accepted": {
			title: "Quotation Accepted",
			subjectStatus: "Accepted",
			message: "You have accepted the quotation! Please submit the required deposit payment to lock in your date and finalize your booking.",
			badgeColor: "#16A34A"
		},
		"awaiting final confirmation": {
			title: "Awaiting Final Confirmation",
			subjectStatus: "Awaiting Confirmation",
			message: "You have accepted the quotation. Our team is finalizing your booking reservation.",
			badgeColor: "#0D9488"
		},
		"quote rejected": {
			title: "Quotation Declined",
			subjectStatus: "Declined",
			message: "Your quotation has been marked as declined. If you would like to explore alternative arrangements or a different package, please let us know.",
			badgeColor: "#64748B"
		},
		"converted to booking": {
			title: "Inquiry Converted to Booking",
			subjectStatus: "Converted to Booking",
			message: "Congratulations! Your inquiry has been confirmed and officially converted into an active booking with Caezelle's Catering.",
			badgeColor: "#16A34A"
		},
		"cancelled": {
			title: "Inquiry Cancelled",
			subjectStatus: "Cancelled",
			message: "Your inquiry has been cancelled. If this was done by mistake or you would like to plan an event in the future, we would be delighted to assist you.",
			badgeColor: "#DC2626"
		}
	};

	const info = statusInfoMap[statusKey] || {
		title: "Inquiry Status Update",
		subjectStatus: normalizedStatus,
		message: customMessage || `Your inquiry status has been updated to "${normalizedStatus}".`,
		badgeColor: "#2C4B8A"
	};

	const displayMessage = customMessage || info.message;
	const ref = inquiry?.reference || inquiry?._id || "Inquiry";
	const eventType = inquiry?.event_type || "Event";
	const eventDate = formatDate(inquiry?.event_date);
	const guestCount = inquiry?.guest_count || "TBD";
	const venue = [inquiry?.street, inquiry?.barangay, inquiry?.municipality, inquiry?.province].filter(Boolean).join(", ") || inquiry?.venue_type || "TBD";
	const quoteTotal = quotation?.total_cost || inquiry?.total_price;
	const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

	const bodyContent = `
    <h2>${info.title}</h2>
    <p>${displayMessage}</p>

    ${quoteTotal && ["quotation sent", "quote accepted", "awaiting final confirmation"].includes(statusKey) ? `
    <div class="highlight">
      <p style="margin:0 0 4px; font-size:0.85rem; color:#64748b;">Quotation Total</p>
      <div class="amount">${formatCurrency(quoteTotal)}</div>
      ${quotation?.deposit_amount ? `<p style="margin:6px 0 0; font-size:0.85rem; color:#64748b;">Required Deposit: <strong>${formatCurrency(quotation.deposit_amount)}</strong></p>` : ""}
    </div>` : ""}

    <div class="info-grid">
      <div class="info-item">
        <label>Reference</label>
        <span>${ref}</span>
      </div>
      <div class="info-item">
        <label>Status</label>
        <span style="color:${info.badgeColor}; font-weight:700;">${normalizedStatus}</span>
      </div>
      <div class="info-item">
        <label>Event Type</label>
        <span>${eventType}</span>
      </div>
      <div class="info-item">
        <label>Event Date</label>
        <span>${eventDate}</span>
      </div>
      <div class="info-item">
        <label>Guest Count</label>
        <span>${guestCount}</span>
      </div>
      <div class="info-item">
        <label>Venue / Location</label>
        <span>${venue}</span>
      </div>
    </div>

    <div class="btn-container">
      <a href="${frontendUrl}/customer/inquiries" class="btn">View My Inquiry</a>
    </div>
  `;

	try {
		await sendEmail({
			to: email,
			subject: `Inquiry ${info.subjectStatus} — ${ref} | Caezelle's Catering`,
			html: wrapHtml(info.title, bodyContent),
			text: `${displayMessage} Reference: ${ref}. Status: ${normalizedStatus}. Event: ${eventType} on ${eventDate}.`
		});
	} catch (err) {
		console.error("[Email Error] Failed to send inquiry status email:", err.message);
	}
};

const sendBookingConfirmationEmail = async ({ booking, customerEmail }) => {
	const email = customerEmail || (await resolveCustomerEmail(booking));
	if (!email) return;

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
      ${booking.venue_type ? `
      <div class="info-item">
        <label>Venue Type</label>
        <span>${booking.venue_type}</span>
      </div>` : ""}
      <div class="info-item">
        <label>Venue Address</label>
        <span>${[booking.street, booking.barangay, booking.municipality, booking.province].filter(Boolean).join(", ") || booking.venue_address || "TBD"}</span>
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
      <li>Remaining balance is due a day after your event date (payable online or in cash to your event manager)</li>
    </ol>

    <div class="btn-container">
      <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/customer/bookings" class="btn">View My Bookings</a>
    </div>
  `;

	try {
		await sendEmail({
			to: email,
			subject: `Booking Confirmed — ${booking.reference || booking._id} | Caezelle's Catering`,
			html: wrapHtml("Booking Confirmation", bodyContent),
			text: `Your booking ${booking.reference || booking._id} for ${booking.event_type || "event"} on ${formatDate(booking.event_date)} has been confirmed. Total: ${formatCurrency(booking.total_price)}.`
		});
	} catch (err) {
		console.error("Failed to send booking confirmation email:", err.message);
	}
};

const sendPaymentReceiptEmail = async ({ payment, booking, customerEmail }) => {
	const email = customerEmail || (await resolveCustomerEmail(booking));
	if (!email) return;

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

    <div class="btn-container">
      <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/customer/payments" class="btn">View Payment History</a>
    </div>
  `;

	try {
		await sendEmail({
			to: email,
			subject: `Payment Receipt — ${formatCurrency(payment.amount)} | Caezelle's Catering`,
			html: wrapHtml("Payment Receipt", bodyContent),
			text: `Payment of ${formatCurrency(payment.amount)} received for booking ${booking?.reference || booking?._id || "N/A"}.`
		});
	} catch (err) {
		console.error("Failed to send payment receipt email:", err.message);
	}
};

const sendFinalInvoiceEmail = async ({ booking, balance, checkoutUrl, customerEmail }) => {
	const email = customerEmail || (await resolveCustomerEmail(booking));
	if (!email) return;

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

    <div class="btn-container">
      <a href="${checkoutUrl || `${process.env.FRONTEND_URL || "http://localhost:5173"}/customer/payments`}" class="btn">Pay Online — ${formatCurrency(balance)}</a>
    </div>

    <p style="font-size:0.85rem; color:#64748b; text-align:center;">
      Remaining balance is payable a day after your event date, online or in cash to your event manager.
    </p>
  `;

	try {
		await sendEmail({
			to: email,
			subject: `Remaining Balance Details — ${formatCurrency(balance)} | ${booking.reference || booking._id}`,
			html: wrapHtml("Final Invoice", bodyContent),
			text: `Remaining balance of ${formatCurrency(balance)} for booking ${booking.reference || booking._id} is due a day after your event date (payable online or in cash to your event manager).`
		});
	} catch (err) {
		console.error("Failed to send final invoice email:", err.message);
	}
};

const sendBookingStatusEmail = async ({ booking, newStatus, customerEmail, customMessage = null }) => {
	const email = customerEmail || (await resolveCustomerEmail(booking));
	if (!email) return;

	const normalizedStatus = String(newStatus || booking.status || "confirmed").trim();
	const statusKey = normalizedStatus.toLowerCase();

	const statusMessages = {
		"deposit pending": "Your booking is awaiting deposit payment. Please submit your deposit to lock in your event date.",
		"confirmed": "Your booking has been confirmed! We're excited to make your event special.",
		"ocular scheduled": "An ocular visit has been scheduled to inspect the event venue layout and technical specifications.",
		"preparing": "We've started preparing for your event. Everything is on track!",
		"food prep": "Our culinary kitchen team is currently preparing your event dishes.",
		"out for delivery": "Your catering order, food warmers, and setup crew are now en route to the event location!",
		"ongoing": "Your event is happening today! Our on-site team is dedicated to providing you and your guests an exceptional experience.",
		"completed": "Your event has been completed. Thank you for choosing Caezelle's Catering! We'd love to hear your feedback.",
		"cancelled": "Your booking has been cancelled. If you have any questions regarding refunds or next steps, please contact us."
	};

	const displayMessage = customMessage || statusMessages[statusKey] || `Your booking status has been updated to: ${normalizedStatus}.`;
	const ref = booking.reference || booking._id;
	const eventType = booking.event_type || "Event";
	const eventDate = formatDate(booking.event_date);
	const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

	const bodyContent = `
    <h2>Booking Status Update</h2>
    <p>${displayMessage}</p>
    
    <div class="info-grid">
      <div class="info-item">
        <label>Reference</label>
        <span>${ref}</span>
      </div>
      <div class="info-item">
        <label>New Status</label>
        <span style="text-transform:capitalize; font-weight:700;">${normalizedStatus}</span>
      </div>
      <div class="info-item">
        <label>Event Type</label>
        <span>${eventType}</span>
      </div>
      <div class="info-item">
        <label>Event Date</label>
        <span>${eventDate}</span>
      </div>
      ${booking.guest_count ? `
      <div class="info-item">
        <label>Guest Count</label>
        <span>${booking.guest_count}</span>
      </div>` : ""}
      ${booking.total_price ? `
      <div class="info-item">
        <label>Total Price</label>
        <span>${formatCurrency(booking.total_price)}</span>
      </div>` : ""}
    </div>

    <div class="btn-container">
      <a href="${frontendUrl}/customer/bookings/${booking._id || ""}" class="btn">View Booking Details</a>
    </div>
  `;

	try {
		const formattedStatus = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
		await sendEmail({
			to: email,
			subject: `Booking ${formattedStatus} — ${ref} | Caezelle's Catering`,
			html: wrapHtml("Booking Update", bodyContent),
			text: `${displayMessage} Reference: ${ref}. Status: ${normalizedStatus}. Event: ${eventType} on ${eventDate}.`
		});
	} catch (err) {
		console.error("[Email Error] Failed to send booking status email:", err.message);
	}
};

const sendAutoCancelEmail = async ({ booking, customerEmail }) => {
	const email = customerEmail || (await resolveCustomerEmail(booking));
	if (!email) return;

	const bodyContent = `
    <h2>Booking Cancelled (Auto-Cancel) ⚠️</h2>
    <p>Your booking has been automatically cancelled because the required deposit was not received within 48 hours.</p>
    
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
    </div>

    <p>If this was a mistake and you still want to proceed, please create a new booking or contact us as soon as possible.</p>

    <div class="btn-container">
      <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/customer/book" class="btn">Create New Booking</a>
    </div>
  `;

	try {
		await sendEmail({
			to: email,
			subject: `Booking Auto-Cancelled — ${booking.reference || booking._id} | Caezelle's Catering`,
			html: wrapHtml("Booking Cancelled", bodyContent),
			text: `Your booking ${booking.reference || booking._id} has been automatically cancelled due to non-payment within 48 hours.`
		});
	} catch (err) {
		console.error("Failed to send auto-cancel email:", err.message);
	}
};

module.exports = {
	resolveCustomerEmail,
	sendInquiryStatusEmail,
	sendBookingConfirmationEmail,
	sendPaymentReceiptEmail,
	sendFinalInvoiceEmail,
	sendBookingStatusEmail,
	sendAutoCancelEmail
};
