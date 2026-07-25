const crypto = require("crypto");
const https = require("https");

const PAYMONGO_API_BASE = "https://api.paymongo.com/v1";

const buildError = (message, statusCode = 500) => {
	const err = new Error(message);
	err.statusCode = statusCode;
	return err;
};

const parseJson = (value, fallback = {}) => {
	try {
		return JSON.parse(value);
	} catch (err) {
		return fallback;
	}
};

const requestPayMongo = ({ path, method = "GET", body }) => {
	const secretKey = process.env.PAYMONGO_SECRET_KEY;
	if (!secretKey) {
		throw buildError("PayMongo is not configured. Missing PAYMONGO_SECRET_KEY", 500);
	}

	const payload = body ? JSON.stringify(body) : null;

	return new Promise((resolve, reject) => {
		const req = https.request(
			`${PAYMONGO_API_BASE}${path}`,
			{
				method,
				headers: {
					Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`,
					"Content-Type": "application/json",
					...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {})
				}
			},
			(res) => {
				let raw = "";
				res.on("data", (chunk) => {
					raw += chunk;
				});
				res.on("end", () => {
					const parsed = parseJson(raw, {});
					if (res.statusCode >= 200 && res.statusCode < 300) {
						return resolve(parsed);
					}

					const apiMessage = parsed?.errors?.[0]?.detail || parsed?.errors?.[0]?.code || "PayMongo request failed";
					return reject(buildError(apiMessage, res.statusCode || 500));
				});
			}
		);

		req.on("error", (err) => reject(buildError(err.message, 500)));

		if (payload) req.write(payload);
		req.end();
	});
};

const toCentavos = (amount) => {
	const value = Number(amount);
	if (!Number.isFinite(value) || value <= 0) {
		throw buildError("Amount must be a positive number", 400);
	}
	return Math.round(value * 100);
};

const parsePayMongoSignature = (signatureHeader = "") => {
	const segments = String(signatureHeader).split(",").map((segment) => segment.trim());
	const mapped = {};
	for (const segment of segments) {
		const [key, value] = segment.split("=");
		if (!key || !value) continue;
		mapped[key] = value;
	}
	return {
		timestamp: mapped.t,
		signature: mapped.v1
	};
};

exports.createCheckoutSession = async ({
	amount,
	currency = "PHP",
	paymentMethodTypes = ["gcash", "paymaya", "card"],
	description,
	successUrl,
	cancelUrl,
	metadata = {},
	customer = {}
}) => {
	const centavos = toCentavos(amount);
	const body = {
		data: {
			attributes: {
				line_items: [
					{
						currency,
						amount: centavos,
						name: description || "iReserve Payment",
						quantity: 1
					}
				],
				payment_method_types: paymentMethodTypes,
				success_url: successUrl,
				cancel_url: cancelUrl,
				description: description || "iReserve Booking Payment",
				send_email_receipt: true,
				show_description: true,
				show_line_items: true,
				metadata,
				...(customer.email && customer.name && {
					billing: {
						name: customer.name,
						email: customer.email,
						...(customer.phone && { phone: customer.phone })
					}
				})
			}
		}
	};

	return requestPayMongo({ path: "/checkout_sessions", method: "POST", body });
};

exports.createPaymentIntent = async ({ amount, description, metadata, paymentMethodTypes = ["card", "paymaya", "gcash"] }) => {
	const body = {
		data: {
			attributes: {
				amount: toCentavos(amount),
				payment_method_allowed: paymentMethodTypes,
				payment_method_options: {
					card: { request_three_d_secure: "any" }
				},
				currency: "PHP",
				description: description || "iReserve Payment",
				metadata
			}
		}
	};
	return requestPayMongo({ path: "/payment_intents", method: "POST", body });
};

exports.createPaymentMethod = async ({ type, details, billing }) => {
	const body = {
		data: {
			attributes: {
				type,
				details,
				...(billing && { billing })
			}
		}
	};
	return requestPayMongo({ path: "/payment_methods", method: "POST", body });
};

exports.attachPaymentIntent = async ({ intentId, methodId, returnUrl }) => {
	const body = {
		data: {
			attributes: {
				payment_method: methodId,
				client_key: undefined, // Not needed for server-to-server attach but some sdks send it
				return_url: returnUrl
			}
		}
	};
	return requestPayMongo({ path: `/payment_intents/${intentId}/attach`, method: "POST", body });
};

exports.getPaymentIntent = async (intentId) => {
	return requestPayMongo({ path: `/payment_intents/${intentId}`, method: "GET" });
};

exports.verifyWebhookSignature = ({ rawBody, signatureHeader }) => {
	const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
	if (!webhookSecret) {
		return process.env.NODE_ENV !== "production";
	}

	const { timestamp, signature } = parsePayMongoSignature(signatureHeader);
	if (!timestamp || !signature) return false;

	const signedPayload = `${timestamp}.${rawBody || ""}`;
	const expected = crypto.createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
	return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

exports.extractWebhookData = (payload = {}) => {
	const eventAttributes = payload?.data?.attributes || {};
	const eventType = eventAttributes.type || "";
	const eventResource = eventAttributes.data || {};
	const resourceAttributes = eventResource.attributes || {};

	const metadata = resourceAttributes.metadata || resourceAttributes.source?.data?.attributes?.metadata || {};

	return {
		eventType,
		checkoutSessionId: eventResource.id || resourceAttributes.checkout_session_id,
		paymentIntentId: resourceAttributes.payment_intent_id,
		referenceNumber: resourceAttributes.reference_number || resourceAttributes.external_reference_number,
		amount: Number(resourceAttributes.amount || 0) / 100,
		metadata
	};
};

exports.isPaidEvent = (eventType = "") => eventType === "checkout_session.payment.paid" || eventType === "payment.paid";

exports.isFailedEvent = (eventType = "") => eventType === "checkout_session.payment.failed" || eventType === "payment.failed";
