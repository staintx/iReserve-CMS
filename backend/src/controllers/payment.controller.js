const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");
const { createNotification } = require("../utils/notify");
const {
	createCheckoutSession,
	createPaymentIntent,
	createPaymentMethod,
	attachPaymentIntent,
	verifyWebhookSignature,
	extractWebhookData,
	isPaidEvent,
	isFailedEvent
} = require("../services/payment.service");
const BusinessInfo = require("../models/BusinessInfo");

async function syncBookingStatus(bookingId) {
	const booking = await Booking.findById(bookingId);
	if (!booking) return;

	const allPayments = await Payment.find({ booking_id: bookingId, status: "approved" });
	const totalPaid = allPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

	let businessInfo;
	try { businessInfo = await BusinessInfo.findOne(); } catch(e) {}
	const depositPercentage = businessInfo?.deposit_percentage ?? 20;
	const requiredDeposit = (booking.total_price * depositPercentage) / 100;

	let newPaymentStatus = "pending";
	let newBookingStatus = booking.status;

	if (totalPaid >= booking.total_price && booking.total_price > 0) {
		newPaymentStatus = "fully_paid";
		if (newBookingStatus === "pending deposit") newBookingStatus = "confirmed";
	} else if (totalPaid >= requiredDeposit && requiredDeposit > 0) {
		newPaymentStatus = "deposit_paid";
		if (newBookingStatus === "pending deposit") newBookingStatus = "confirmed";
	}

	await Booking.findByIdAndUpdate(bookingId, {
		payment_status: newPaymentStatus,
		status: newBookingStatus
	});
}

exports.create = asyncHandler(async (req, res) => {
	if (req.user?.role === "customer") {
		return res.status(403).json({ message: "Forbidden" });
	}
	const payment = await Payment.create(req.body);
	if (payment.status === "approved" && payment.booking_id) {
		await syncBookingStatus(payment.booking_id);
	}
	res.status(201).json(payment);
});
exports.getAll = asyncHandler(async (req, res) => res.json(await Payment.find().populate("booking_id customer_id")));
exports.getMine = asyncHandler(async (req, res) => res.json(await Payment.find({ customer_id: req.user._id }).populate("booking_id customer_id")));
exports.getById = asyncHandler(async (req, res) => {
	if (req.user?.role === "customer") {
		const payment = await Payment.findOne({ _id: req.params.id, customer_id: req.user._id })
			.populate("booking_id customer_id");
		if (!payment) return res.status(404).json({ message: "Payment not found" });
		return res.json(payment);
	}

	res.json(await Payment.findById(req.params.id).populate("booking_id customer_id"));
});

exports.update = asyncHandler(async (req, res) => {
	const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
	if (req.body.status && payment && payment.booking_id) {
		await syncBookingStatus(payment.booking_id);
		
		const io = req.app.get("io");
		if (payment.customer_id && io) {
			const statusLabel = payment.status === "approved" ? "Payment approved" : "Payment update";
			const body = payment.status === "approved"
				? "Your payment has been approved."
				: payment.status === "rejected"
					? "Your payment failed. Please try again."
					: "Your payment is being processed.";
			await createNotification({
				userId: payment.customer_id,
				title: statusLabel,
				body,
				type: payment.status === "approved" ? "success" : payment.status === "rejected" ? "error" : "info",
				link: "/customer/payments",
				meta: { payment_id: payment._id, booking_id: payment.booking_id }
			}, io);
		}
	}
	res.json(payment);
});
exports.remove = asyncHandler(async (req, res) => { await Payment.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); });

exports.createCheckout = asyncHandler(async (req, res) => {
	const {
		booking_id,
		amount,
		payment_type = "deposit",
		payment_method_types = ["gcash", "paymaya", "card"],
		success_url,
		cancel_url
	} = req.body;

	if (!booking_id) {
		return res.status(400).json({ message: "booking_id is required" });
	}

	const booking = await Booking.findById(booking_id).populate("customer_id");
	if (!booking) {
		return res.status(404).json({ message: "Booking not found" });
	}

	const isOwner = String(booking.customer_id?._id) === String(req.user._id);
	const isPrivileged = ["admin", "staff"].includes(req.user.role);
	if (!isOwner && !isPrivileged) {
		return res.status(403).json({ message: "Not allowed to pay for this booking" });
	}

	const fallbackAmount = Number(booking.total_price || 0);
	const payableAmount = Number(amount || fallbackAmount);
	if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
		return res.status(400).json({ message: "Invalid amount" });
	}

	const appBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
	const successUrl = success_url || `${appBaseUrl}/customer/payments?status=success`;
	const cancelUrl = cancel_url || `${appBaseUrl}/customer/payments?status=cancelled`;

	const payment = await Payment.create({
		booking_id: booking._id,
		customer_id: booking.customer_id?._id || req.user._id,
		amount: payableAmount,
		currency: "PHP",
		payment_type,
		method: "paymongo",
		status: "pending",
		gateway: "paymongo"
	});

	let eventName = booking.event_type || "Event";
	const paymentLabel = payment_type === "deposit" ? "Deposit" : payment_type === "full" ? "Full Payment" : "Balance";
	const formattedDescription = `${eventName} Booking - ${paymentLabel}`;

	const contactName = (booking.contact_first_name && booking.contact_last_name) 
		? `${booking.contact_first_name} ${booking.contact_last_name}` 
		: booking.contact_first_name || booking.contact_last_name;

	const customerDetails = {
		name: contactName || booking.customer_id?.full_name || req.user?.full_name || "Customer",
		email: booking.contact_email || booking.customer_id?.email || req.user?.email || "customer@example.com",
		phone: booking.contact_phone || booking.customer_id?.phone || req.user?.phone
	};

	const checkout = await createCheckoutSession({
		amount: payableAmount,
		currency: "PHP",
		paymentMethodTypes: payment_method_types,
		description: formattedDescription,
		successUrl,
		cancelUrl,
		metadata: {
			local_payment_id: String(payment._id),
			booking_id: String(booking._id),
			customer_id: String(booking.customer_id?._id || req.user._id),
			payment_type
		},
		customer: customerDetails
	});

	const checkoutData = checkout?.data || {};
	const checkoutAttributes = checkoutData.attributes || {};

	payment.gateway_checkout_id = checkoutData.id;
	payment.checkout_url = checkoutAttributes.checkout_url;
	payment.metadata = checkoutAttributes.metadata || payment.metadata;
	await payment.save();

	res.status(201).json({
		payment,
		checkout_url: checkoutAttributes.checkout_url,
		checkout_id: checkoutData.id
	});
});

exports.createIntent = asyncHandler(async (req, res) => {
	const { booking_id, amount, payment_type = "deposit" } = req.body;
	
	if (!booking_id) return res.status(400).json({ message: "booking_id is required" });
	const booking = await Booking.findById(booking_id).populate("customer_id");
	if (!booking) return res.status(404).json({ message: "Booking not found" });

	const isOwner = String(booking.customer_id?._id) === String(req.user._id);
	const isPrivileged = ["admin", "staff"].includes(req.user.role);
	if (!isOwner && !isPrivileged) return res.status(403).json({ message: "Not allowed to pay for this booking" });

	const payableAmount = Number(amount || booking.total_price || 0);
	if (!Number.isFinite(payableAmount) || payableAmount <= 0) return res.status(400).json({ message: "Invalid amount" });

	const payment = await Payment.create({
		booking_id: booking._id,
		customer_id: booking.customer_id?._id || req.user._id,
		amount: payableAmount,
		currency: "PHP",
		payment_type,
		method: "paymongo",
		status: "pending",
		gateway: "paymongo"
	});

	let eventName = booking.event_type || "Event";
	const paymentLabel = payment_type === "deposit" ? "Deposit" : payment_type === "full" ? "Full Payment" : "Balance";
	
	const intent = await createPaymentIntent({
		amount: payableAmount,
		description: `${eventName} Booking - ${paymentLabel}`,
		metadata: {
			local_payment_id: String(payment._id),
			booking_id: String(booking._id),
			customer_id: String(booking.customer_id?._id || req.user._id),
			payment_type
		}
	});

	const intentData = intent?.data || {};
	payment.paymongo_payment_intent_id = intentData.id;
	await payment.save();

	res.status(201).json({ payment, intent_id: intentData.id, client_key: intentData.attributes?.client_key });
});

exports.processIntent = asyncHandler(async (req, res) => {
	const { intent_id, payment_method_type, details, billing, return_url } = req.body;
	
	if (!intent_id || !payment_method_type) return res.status(400).json({ message: "intent_id and payment_method_type are required" });

	const method = await createPaymentMethod({ type: payment_method_type, details, billing });
	const methodId = method?.data?.id;
	
	if (!methodId) return res.status(500).json({ message: "Failed to create payment method" });

	const appBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
	const attachResult = await attachPaymentIntent({
		intentId: intent_id,
		methodId,
		returnUrl: return_url || `${appBaseUrl}/customer/payments?status=success`
	});

	const attachAttrs = attachResult?.data?.attributes || {};
	const nextActionUrl = attachAttrs.next_action?.redirect?.url;
	const status = attachAttrs.status;

	if (status === "succeeded") {
		const payment = await Payment.findOne({ paymongo_payment_intent_id: intent_id });
		if (payment) {
			payment.status = "approved";
			payment.paid_at = new Date();
			await payment.save();
			if (payment.booking_id) {
				await syncBookingStatus(payment.booking_id);
			}
		}
	}

	res.json({
		status,
		next_action_url: nextActionUrl,
		attachResult
	});
});

exports.verifyPayment = asyncHandler(async (req, res) => {
	const { id } = req.params;
	const payment = await Payment.findById(id);
	
	if (!payment) return res.status(404).json({ message: "Payment not found" });
	if (payment.status === "approved") return res.json({ payment });
	if (!payment.paymongo_payment_intent_id) return res.json({ payment });

	const { getPaymentIntent } = require("../services/payment.service");
	const intentRes = await getPaymentIntent(payment.paymongo_payment_intent_id);
	
	const intentStatus = intentRes?.data?.attributes?.status;
	if (intentStatus === "succeeded") {
		payment.status = "approved";
		payment.paid_at = new Date();
		await payment.save();
		if (payment.booking_id) {
			await syncBookingStatus(payment.booking_id);
		}
	}

	res.json({ payment });
});

exports.handleWebhook = asyncHandler(async (req, res) => {
	const signatureHeader = req.headers["paymongo-signature"] || "";
	const rawBody = req.rawBody || JSON.stringify(req.body || {});

	const isValidSignature = verifyWebhookSignature({ rawBody, signatureHeader });
	if (!isValidSignature) {
		return res.status(401).json({ message: "Invalid webhook signature" });
	}

	const payload = req.body || {};
	const event = extractWebhookData(payload);

	let payment = null;
	if (event.metadata?.local_payment_id) {
		payment = await Payment.findById(event.metadata.local_payment_id);
	}
	if (!payment && event.checkoutSessionId) {
		payment = await Payment.findOne({ gateway_checkout_id: event.checkoutSessionId });
	}

	if (!payment) {
		return res.status(200).json({ ok: true, message: "No matching local payment" });
	}

	payment.gateway_reference = event.referenceNumber || payment.gateway_reference;
	payment.gateway_payment_intent_id = event.paymentIntentId || payment.gateway_payment_intent_id;
	payment.metadata = {
		...(payment.metadata || {}),
		...(event.metadata || {})
	};

	if (isPaidEvent(event.eventType)) {
		payment.status = "approved";
		payment.paid_at = new Date();
	} else if (isFailedEvent(event.eventType)) {
		payment.status = "rejected";
	}
	if (event.amount > 0) payment.amount = event.amount;

	await payment.save();

	if (payment.booking_id) {
		await syncBookingStatus(payment.booking_id);
	}

	const io = req.app.get("io");

	if (payment.customer_id) {
		const statusLabel = payment.status === "approved" ? "Payment approved" : "Payment update";
		const body = payment.status === "approved"
			? "Your payment has been approved."
			: payment.status === "rejected"
				? "Your payment failed. Please try again."
				: "Your payment is being processed.";
		await createNotification({
			userId: payment.customer_id,
			title: statusLabel,
			body,
			type: payment.status === "approved" ? "success" : payment.status === "rejected" ? "error" : "info",
			link: "/customer/payments",
			meta: { payment_id: payment._id, booking_id: payment.booking_id }
		}, io);
	}

	if (payment.status === "approved") {
		const { notifyAdmins } = require("../utils/notify");
		await notifyAdmins({
			title: "Deposit Received",
			body: `Payment of ₱${(payment.amount / 100).toFixed(2)} has been approved for booking.`,
			type: "success",
			link: "/admin/payments",
			meta: { payment_id: payment._id, booking_id: payment.booking_id }
		}, io);
	}

	res.status(200).json({ ok: true });
});