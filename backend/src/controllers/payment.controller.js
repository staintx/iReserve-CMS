const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const InventoryReservation = require("../models/InventoryReservation");
const asyncHandler = require("../utils/asyncHandler");
const { createNotification } = require("../utils/notify");
const {
	createCheckoutSession,
	createPaymentIntent,
	createPaymentMethod,
	attachPaymentIntent,
	getPaymentIntent,
	getCheckoutSession,
	verifyWebhookSignature,
	extractWebhookData,
	isPaidEvent,
	isFailedEvent
} = require("../services/payment.service");
const BusinessInfo = require("../models/BusinessInfo");
const { sendPaymentReceiptEmail } = require("../utils/booking-emails");

const isSuccessfulPaymentStatus = (status) =>
	["paid", "succeeded"].includes(String(status || "").toLowerCase());

const syncPaymentFromGateway = async (payment) => {
	if (!payment || payment.status === "approved") return payment;

	if (payment.gateway_payment_intent_id) {
		const intentRes = await getPaymentIntent(
			payment.gateway_payment_intent_id,
		);
		if (isSuccessfulPaymentStatus(intentRes?.data?.attributes?.status)) {
			payment.status = "approved";
			payment.paid_at = new Date();
		}
	} else if (payment.gateway_checkout_id) {
		const checkoutRes = await getCheckoutSession(payment.gateway_checkout_id);
		const attributes = checkoutRes?.data?.attributes || {};
		const paymentIntent = attributes.payment_intent || {};
		const gatewayPayments = attributes.payments || [];
		
		const hasPaidPayment = gatewayPayments.some(p => isSuccessfulPaymentStatus(p?.attributes?.status));

		const gatewayStatus =
			hasPaidPayment ? "paid" : (paymentIntent?.attributes?.status || attributes.payment_status || attributes.status);

		payment.gateway_payment_intent_id =
			paymentIntent?.id || attributes.payment_intent_id || payment.gateway_payment_intent_id;
		if (isSuccessfulPaymentStatus(gatewayStatus)) {
			payment.status = "approved";
			payment.paid_at = new Date();
		}
	}

	if (payment.status === "approved") {
		await payment.save();
		if (payment.booking_id) await syncBookingStatus(payment.booking_id);
	} else if (payment.gateway_payment_intent_id) {
		await payment.save();
	}

	return payment;
};

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

	if (booking.status !== "confirmed" && newBookingStatus === "confirmed") {
		if (booking.inventory_items && booking.inventory_items.length > 0) {
			const reservations = booking.inventory_items
				.filter(item => item.inventory_id)
				.map(item => ({
					inventory_id: item.inventory_id,
					booking_id: booking._id,
					event_date: booking.event_date,
					quantity: item.quantity
				}));
			if (reservations.length > 0) {
				await InventoryReservation.insertMany(reservations);
			}
		}
	}
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
exports.getMine = asyncHandler(async (req, res) => {
	const pendingGatewayPayments = await Payment.find({
		customer_id: req.user._id,
		gateway: "paymongo",
		status: "pending",
	}).limit(20);

	await Promise.allSettled(
		pendingGatewayPayments.map((payment) => syncPaymentFromGateway(payment)),
	);

	res.json(
		await Payment.find({ customer_id: req.user._id })
			.sort({ createdAt: -1 })
			.populate("booking_id customer_id"),
	);
});
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
	const successUrl = new URL(
		success_url || `${appBaseUrl}/customer/payments?status=success`,
	).toString();
	const successUrlWithPayment = new URL(successUrl);
	successUrlWithPayment.searchParams.set("payment_id", String(payment._id));

	let mappedPaymentMethodTypes = [];
	for (const pm of payment_method_types) {
		if (pm === "online_banking") {
			mappedPaymentMethodTypes.push("dob", "dob_ubp");
		} else {
			mappedPaymentMethodTypes.push(pm);
		}
	}

	const checkout = await createCheckoutSession({
		amount: payableAmount,
		currency: "PHP",
		paymentMethodTypes: mappedPaymentMethodTypes,
		description: formattedDescription,
		successUrl: successUrlWithPayment.toString(),
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
	payment.gateway_payment_intent_id = intentData.id;
	await payment.save();

	res.status(201).json({ payment, intent_id: intentData.id, client_key: intentData.attributes?.client_key });
});

exports.processIntent = asyncHandler(async (req, res) => {
	const { intent_id, payment_method_type, details, billing, return_url } = req.body;
	
	if (!intent_id || !payment_method_type) return res.status(400).json({ message: "intent_id and payment_method_type are required" });
	const localPayment = await Payment.findOne({
		gateway_payment_intent_id: intent_id,
	});
	if (!localPayment) return res.status(404).json({ message: "Payment not found" });
	const isOwner = String(localPayment.customer_id) === String(req.user._id);
	const isPrivileged = ["admin", "staff"].includes(req.user.role);
	if (!isOwner && !isPrivileged) {
		return res.status(403).json({ message: "Not allowed to process this payment" });
	}

	const method = await createPaymentMethod({ type: payment_method_type, details, billing });
	const methodId = method?.data?.id;
	
	if (!methodId) return res.status(500).json({ message: "Failed to create payment method" });

	const appBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
	const defaultReturnUrl = new URL(`${appBaseUrl}/customer/payments?status=success`);
	defaultReturnUrl.searchParams.set("payment_id", String(localPayment._id));
	const attachResult = await attachPaymentIntent({
		intentId: intent_id,
		methodId,
		returnUrl: return_url || defaultReturnUrl.toString()
	});

	const attachAttrs = attachResult?.data?.attributes || {};
	const nextActionUrl = attachAttrs.next_action?.redirect?.url;
	const status = attachAttrs.status;

	if (status === "succeeded") {
		localPayment.status = "approved";
		localPayment.paid_at = new Date();
		await localPayment.save();
		if (localPayment.booking_id) await syncBookingStatus(localPayment.booking_id);
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
	const isOwner = String(payment.customer_id) === String(req.user._id);
	const isPrivileged = ["admin", "staff"].includes(req.user.role);
	if (!isOwner && !isPrivileged) {
		return res.status(403).json({ message: "Not allowed to verify this payment" });
	}

	await syncPaymentFromGateway(payment);
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
	if (!payment && event.paymentIntentId) {
		payment = await Payment.findOne({ gateway_payment_intent_id: event.paymentIntentId });
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
			title: "Payment Received",
			body: `Payment of ₱${Number(payment.amount).toLocaleString()} has been approved for booking.`,
			type: "success",
			link: "/admin/payments",
			meta: { payment_id: payment._id, booking_id: payment.booking_id }
		}, io);

		// Send payment receipt email
		if (payment.booking_id) {
			const receiptBooking = await Booking.findById(payment.booking_id).populate("customer_id");
			const receiptEmail = receiptBooking?.contact_email || receiptBooking?.customer_id?.email;
			if (receiptEmail) {
				sendPaymentReceiptEmail({ payment, booking: receiptBooking, customerEmail: receiptEmail }).catch(() => {});
			}
		}
	}

	res.status(200).json({ ok: true });
});
