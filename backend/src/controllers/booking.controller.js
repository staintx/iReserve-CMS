const Booking = require("../models/Booking");
const Inventory = require("../models/Inventory");
const InventoryReservation = require("../models/InventoryReservation");

const checkInventoryAvailability = async (eventDate, inventoryItems, excludeBookingId = null) => {
	if (!inventoryItems || inventoryItems.length === 0) return { available: true };
	
	const dayStart = new Date(eventDate);
	dayStart.setHours(0, 0, 0, 0);
	const dayEnd = new Date(eventDate);
	dayEnd.setHours(23, 59, 59, 999);

	for (const item of inventoryItems) {
		if (!item.inventory_id) continue;
		const inv = await Inventory.findById(item.inventory_id);
		if (!inv) continue;

		const query = {
			inventory_id: item.inventory_id,
			event_date: { $gte: dayStart, $lte: dayEnd }
		};
		if (excludeBookingId) {
			query.booking_id = { $ne: excludeBookingId };
		}

		const reservations = await InventoryReservation.find(query);
		const reservedQuantity = reservations.reduce((sum, res) => sum + res.quantity, 0);

		if (reservedQuantity + Number(item.quantity || 0) > inv.quantity) {
			return { available: false, itemName: inv.item_name };
		}
	}
	return { available: true };
};

const asyncHandler = require("../utils/asyncHandler");
const { createNotification, notifyAdmins } = require("../utils/notify");
const logAction = require("../utils/logAction");

const parseTimeToMinutes = (timeValue) => {
	if (!timeValue) return null;
	const normalized = String(timeValue).trim().toLowerCase();
	const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
	if (!match) return null;
	let hours = Number(match[1]);
	const minutes = match[2] ? Number(match[2]) : 0;
	const period = match[3];

	if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
	if (period) {
		if (hours === 12) hours = 0;
		if (period === "pm") hours += 12;
	}
	if (hours > 23 || minutes > 59) return null;
	return hours * 60 + minutes;
};

const getDateStatus = (value) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return { valid: false, past: false };
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	return { valid: true, past: date < today };
};

const getThreeDayLockout = (eventDate) => {
	const msUntilEvent = new Date(eventDate).getTime() - Date.now();
	const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
	return msUntilEvent <= threeDaysMs;
};

const normalizeText = (value) =>
	String(value || "")
		.trim()
		.toLowerCase()
		.replace(/\s+/g, " ");

const sameLocation = (requestLocation, existingLocation) => {
	const keys = ["venue_type", "province", "municipality", "barangay", "street"];
	const hasAny = keys.some((key) => Boolean(requestLocation?.[key]));
	if (!hasAny) return true;

	return keys.every((key) => {
		const requested = requestLocation?.[key];
		if (!requested) return true;
		return normalizeText(existingLocation?.[key]) === normalizeText(requested);
	});
};

const getTimeRange = (startTime, durationHours) => {
	const startMinutes = parseTimeToMinutes(startTime);
	const duration = Number(durationHours);
	if (startMinutes === null || Number.isNaN(duration) || duration <= 0) return null;
	return { startMinutes, endMinutes: startMinutes + duration * 60 };
};

const findBookingConflict = async ({ eventDate, startTime, durationHours, excludeId, location, bufferMinutes }) => {
	if (!eventDate) return null;
	const date = new Date(eventDate);
	if (Number.isNaN(date.getTime())) return null;
	const buffer = Number(bufferMinutes) || Number(process.env.BOOKING_BUFFER_MINUTES) || 0;

	const dayStart = new Date(date);
	dayStart.setHours(0, 0, 0, 0);
	const dayEnd = new Date(date);
	dayEnd.setHours(23, 59, 59, 999);

	const query = {
		status: { $in: ["pending deposit", "confirmed", "preparing", "ongoing"] },
		event_date: { $gte: dayStart, $lte: dayEnd }
	};
	if (excludeId) query._id = { $ne: excludeId };

	const existingBookings = await Booking.find(query);
	if (existingBookings.length === 0) return null;

	const newRange = getTimeRange(startTime, durationHours);
	if (!newRange) {
		return existingBookings.find((booking) => sameLocation(location, booking)) || null;
	}

	return (
		existingBookings.find((booking) => {
			if (!sameLocation(location, booking)) return false;
			const existingRange = getTimeRange(booking.start_time, booking.duration_hours);
			if (!existingRange) return true;
			const existingStart = existingRange.startMinutes - buffer;
			const existingEnd = existingRange.endMinutes + buffer;
			return newRange.startMinutes < existingEnd && newRange.endMinutes > existingStart;
		}) || null
	);
};

exports.create = asyncHandler(async (req, res) => {
	const dateStatus = getDateStatus(req.body.event_date);
	if (!dateStatus.valid) {
		return res.status(400).json({ message: "Event date is invalid" });
	}
	if (dateStatus.past) {
		return res.status(400).json({ message: "Event date must be today or later" });
	}

	if (req.user?.role === "customer") {
		req.body.customer_id = req.user._id;
		req.body.status = "pending deposit";
		req.body.payment_status = "pending";
	} else if (!req.body.status) {
		req.body.status = "pending deposit";
	}

	const conflict = await findBookingConflict({
		eventDate: req.body.event_date,
		startTime: req.body.start_time,
		durationHours: req.body.duration_hours,
		location: req.body,
		bufferMinutes: req.body.buffer_minutes
	});
	if (conflict) {
		return res.status(409).json({
			message: "Booking conflict detected for the selected date/time",
			conflict_id: conflict._id
		});
	}

	const invCheck = await checkInventoryAvailability(req.body.event_date, req.body.inventory_items);
	if (!invCheck.available) {
		return res.status(409).json({
			message: `Inventory conflict: Not enough '${invCheck.itemName}' available on this date.`
		});
	}

	const booking = await Booking.create(req.body);

	if (booking.status === "confirmed" && booking.inventory_items?.length > 0) {
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

	await logAction({
		user_id: req.user._id,
		action: "booking_created",
		entity_type: "booking",
		entity_id: booking._id,
		details: `Created booking for ${booking.event_type || "event"} on ${booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "N/A"}`,
		ip_address: req.ip
	});

	res.status(201).json(booking);
});



exports.getAll = asyncHandler(async (req, res) => {
	res.json(await Booking.find().populate("customer_id package_id event_manager_id staff_ids"));
});

exports.getMine = asyncHandler(async (req, res) => {
	res.json(await Booking.find({ customer_id: req.user._id }).populate("customer_id package_id event_manager_id staff_ids"));
});

exports.getById = asyncHandler(async (req, res) => {
	if (req.user?.role === "customer") {
		const booking = await Booking.findOne({ _id: req.params.id, customer_id: req.user._id })
			.populate("customer_id package_id event_manager_id staff_ids");
		if (!booking) return res.status(404).json({ message: "Booking not found" });
		return res.json(booking);
	}

	res.json(await Booking.findById(req.params.id).populate("customer_id package_id event_manager_id staff_ids"));
});

exports.update = asyncHandler(async (req, res) => {
	const current = await Booking.findById(req.params.id);
	if (!current) return res.status(404).json({ message: "Booking not found" });

	if (getThreeDayLockout(current.event_date)) {
		const allowedLateFields = [
			"status",
			"payment_status",
			"payment_method",
			"event_manager_id",
			"staff_ids",
			"staff_assignments",
			"equipment_assignments",
			"equipment_returned"
		];
		const hasDisallowedFields = Object.keys(req.body).some((key) => !allowedLateFields.includes(key));
		if (hasDisallowedFields) {
			return res.status(400).json({ message: "Booking details cannot be changed 3 days before the event." });
		}
	}

	if (req.body.event_date) {
		const dateStatus = getDateStatus(req.body.event_date);
		if (!dateStatus.valid) {
			return res.status(400).json({ message: "Event date is invalid" });
		}
		if (dateStatus.past) {
			return res.status(400).json({ message: "Event date must be today or later" });
		}
	}

	const nextEventDate = req.body.event_date || current.event_date;
	const nextStartTime = req.body.start_time || current.start_time;
	const nextDuration = req.body.duration_hours || current.duration_hours;

	const conflict = await findBookingConflict({
		eventDate: nextEventDate,
		startTime: nextStartTime,
		durationHours: nextDuration,
		excludeId: current._id,
		location: {
			venue_type: req.body.venue_type || current.venue_type,
			province: req.body.province || current.province,
			municipality: req.body.municipality || current.municipality,
			barangay: req.body.barangay || current.barangay,
			street: req.body.street || current.street
		},
		bufferMinutes: req.body.buffer_minutes
	});
	if (conflict) {
		return res.status(409).json({
			message: "Booking conflict detected for the selected date/time",
			conflict_id: conflict._id
		});
	}

	const requestedInventory = req.body.inventory_items || current.inventory_items;
	const invCheck = await checkInventoryAvailability(nextEventDate, requestedInventory, current._id);
	if (!invCheck.available) {
		return res.status(409).json({
			message: `Inventory conflict: Not enough '${invCheck.itemName}' available on this date.`
		});
	}

	const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });

	if (current.status !== "confirmed" && updated.status === "confirmed") {
		if (updated.inventory_items?.length > 0) {
			const reservations = updated.inventory_items
				.filter(item => item.inventory_id)
				.map(item => ({
					inventory_id: item.inventory_id,
					booking_id: updated._id,
					event_date: updated.event_date,
					quantity: item.quantity
				}));
			if (reservations.length > 0) {
				await InventoryReservation.insertMany(reservations);
			}
		}
	} else if (current.status === "confirmed" && ["cancelled", "refunded"].includes(updated.status)) {
		await InventoryReservation.deleteMany({ booking_id: updated._id });
	}

	// Build changes object for the log
	const trackFields = ["status", "payment_status", "payment_method", "event_type", "event_theme", "event_date", "start_time", "guest_count", "duration_hours", "total_price", "event_manager_id", "venue_type", "province", "municipality", "barangay", "street"];
	const changes = {};
	for (const field of trackFields) {
		if (req.body[field] !== undefined && String(current[field] ?? "") !== String(req.body[field] ?? "")) {
			changes[field] = { from: current[field], to: req.body[field] };
		}
	}

	const changedFieldNames = Object.keys(changes);
	const detailParts = changedFieldNames.length > 0
		? changedFieldNames.join(", ")
		: Object.keys(req.body).join(", ");

	if (req.user) {
		await logAction({
			user_id: req.user._id,
			action: "booking_updated",
			entity_type: "booking",
			entity_id: updated._id,
			details: `Updated booking #${updated._id} — Fields: ${detailParts}`,
			changes: Object.keys(changes).length > 0 ? changes : undefined,
			ip_address: req.ip
		});
	}

	if (updated?.customer_id && req.user?.role !== "customer") {
		const statusChanged = current.status !== updated.status;
		const paymentChanged = current.payment_status !== updated.payment_status;
		const otherChanged = Object.keys(req.body).some((key) => !["status", "payment_status", "payment_method"].includes(key));

		if (statusChanged || paymentChanged || otherChanged) {
			let label = "Booking Updated";
			let message = "Your booking details have been updated.";
			if (statusChanged) {
				label = "Booking Status Update";
				message = `Your booking status is now: ${updated.status}.`;
			} else if (paymentChanged) {
				label = "Payment Status Update";
				message = `Your payment status is now: ${updated.payment_status}.`;
			}
			
			const io = req.app.get("io");
			await createNotification({
				userId: updated.customer_id,
				title: label,
				body: message,
				type: "info",
				link: "/customer/bookings"
			}, io);
		}

		if (otherChanged && updated.change_request?.status === "pending") {
			updated.change_request = {
				...updated.change_request.toObject?.(),
				status: "approved",
				resolved_at: new Date()
			};
			await updated.save();
		}
	}

	res.json(updated);
});


exports.addGuests = asyncHandler(async (req, res) => {
	const booking = await Booking.findById(req.params.id);
	if (!booking) return res.status(404).json({ message: "Booking not found" });
	if (String(booking.customer_id) !== String(req.user?._id)) {
		return res.status(403).json({ message: "Forbidden" });
	}
	if (getThreeDayLockout(booking.event_date)) {
		return res.status(400).json({ message: "Booking details cannot be changed 3 days before the event." });
	}

	const additionalGuests = Number(req.body.additional_guests);
	if (!additionalGuests || additionalGuests <= 0) {
		return res.status(400).json({ message: "Invalid number of guests to add" });
	}

	// Calculate difference
	const pricePerHead = 500; // Hardcoded fallback or get from package
	const amountDue = additionalGuests * pricePerHead;

	booking.guest_count += additionalGuests;
	booking.total_price += amountDue;
	await booking.save();

	// Create payment checkout
	const { createCheckoutSession } = require("../services/payment.service");
	const Payment = require("../models/Payment");

	const appBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
	const successUrl = `${appBaseUrl}/customer/payments?status=success`;
	const cancelUrl = `${appBaseUrl}/customer/payments?status=cancelled`;

	const payment = await Payment.create({
		booking_id: booking._id,
		customer_id: booking.customer_id,
		amount: amountDue,
		currency: "PHP",
		payment_type: "upgrade",
		method: "paymongo",
		status: "pending",
		gateway: "paymongo"
	});

	const checkout = await createCheckoutSession({
		amount: amountDue,
		currency: "PHP",
		paymentMethodTypes: ["gcash", "paymaya", "card"],
		description: `Added ${additionalGuests} guests for Booking ${booking._id}`,
		successUrl,
		cancelUrl,
		metadata: {
			local_payment_id: String(payment._id),
			booking_id: String(booking._id),
			customer_id: String(booking.customer_id),
			payment_type: "upgrade",
			additional_guests: additionalGuests
		}
	});

	payment.gateway_checkout_id = checkout.data.id;
	payment.checkout_url = checkout.data.attributes.checkout_url;
	await payment.save();

	await logAction({
		user_id: req.user._id,
		action: "booking_guests_added",
		entity_type: "booking",
		entity_id: booking._id,
		details: `Customer added ${additionalGuests} guests via self-service`,
		ip_address: req.ip
	});

	res.json({ booking, checkout_url: payment.checkout_url });
});

exports.requestChange = asyncHandler(async (req, res) => {
	const booking = await Booking.findById(req.params.id);
	if (!booking) return res.status(404).json({ message: "Booking not found" });
	if (String(booking.customer_id) !== String(req.user?._id)) {
		return res.status(403).json({ message: "Forbidden" });
	}
	if (getThreeDayLockout(booking.event_date)) {
		return res.status(400).json({ message: "Booking details cannot be changed 3 days before the event." });
	}

	const requestMessage = String(req.body.message || "").trim();
	if (!requestMessage) {
		return res.status(400).json({ message: "Please describe the booking changes you want." });
	}

	const isUpdate = booking.change_request?.status === "pending";

	booking.change_request = {
		status: "pending",
		message: requestMessage,
		requested_at: new Date(),
		resolved_at: null
	};
	await booking.save();

	await logAction({
		user_id: req.user._id,
		action: "booking_change_requested",
		entity_type: "booking",
		entity_id: booking._id,
		details: `Requested booking change for ${booking.event_type || "event"} on ${booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "N/A"}`,
		changes: { change_request: { to: requestMessage } },
		ip_address: req.ip
	});

	const io = req.app.get("io");
	await notifyAdmins({
		title: isUpdate ? "Booking change request updated" : "Booking change request",
		body: isUpdate
			? `${req.user.full_name || req.user.email || "A customer"} updated the change request for booking #${booking._id}.`
			: `${req.user.full_name || req.user.email || "A customer"} requested a change for booking #${booking._id}.`,
		type: "info",
		link: `/admin/bookings/${booking._id}/details`,
		meta: {
			booking_id: booking._id,
			message: requestMessage
		}
	}, io);

	res.json(booking);
});


exports.processRefund = asyncHandler(async (req, res) => {
	const booking = await Booking.findById(req.params.id);
	if (!booking) return res.status(404).json({ message: "Booking not found" });

	const refundAmount = Number(req.body.amount);
	if (isNaN(refundAmount) || refundAmount < 0) {
		return res.status(400).json({ message: "Invalid refund amount" });
	}
	
	const deductionReason = req.body.reason || "Post-ocular cancellation deduction";

	// Cancel booking and update payment status
	booking.status = "cancelled";
	booking.payment_status = "refunded";
	await booking.save();
	
	// Create negative payment record for refund
	const Payment = require("../models/Payment");
	await Payment.create({
		booking_id: booking._id,
		customer_id: booking.customer_id,
		amount: -refundAmount,
		currency: "PHP",
		payment_type: "refund",
		method: "manual",
		status: "approved",
		gateway: "manual",
		metadata: {
			reason: deductionReason
		}
	});

	await logAction({
		user_id: req.user._id,
		action: "booking_refunded",
		entity_type: "booking",
		entity_id: booking._id,
		details: `Processed custom refund of PHP ${refundAmount}. Reason: ${deductionReason}`,
		ip_address: req.ip
	});

	// Notify customer
	const io = req.app.get("io");
	await notifyAdmins({
		title: "Booking Cancelled & Refunded",
		body: `Admin processed a custom refund of PHP ${refundAmount} for booking #${booking._id}.`,
		type: "info",
		link: `/admin/bookings/${booking._id}/details`,
		meta: { booking_id: booking._id }
	}, io);

	res.json({ message: "Refund processed successfully", booking });
});

exports.remove = asyncHandler(async (req, res) => {
	const booking = await Booking.findById(req.params.id);
	const bookingLabel = booking ? `${booking.event_type || "booking"} on ${booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "N/A"}` : req.params.id;

	await Booking.findByIdAndDelete(req.params.id);

	if (req.user) {
		await logAction({
			user_id: req.user._id,
			action: "booking_deleted",
			entity_type: "booking",
			entity_id: req.params.id,
			details: `Deleted booking — ${bookingLabel}`,
			ip_address: req.ip
		});
	}

	res.json({ message: "Deleted" });
});

exports.checkAvailability = asyncHandler(async (req, res) => {
	const conflict = await findBookingConflict({
		eventDate: req.query.event_date,
		startTime: req.query.start_time,
		durationHours: req.query.duration_hours,
		location: {
			venue_type: req.query.venue_type,
			province: req.query.province,
			municipality: req.query.municipality,
			barangay: req.query.barangay,
			street: req.query.street
		},
		bufferMinutes: req.query.buffer_minutes
	});

	let inventoryAvailable = true;
	let itemName = null;
	if (req.query.inventory_items) {
		try {
			const items = JSON.parse(req.query.inventory_items);
			const invCheck = await checkInventoryAvailability(req.query.event_date, items);
			if (!invCheck.available) {
				inventoryAvailable = false;
				itemName = invCheck.itemName;
			}
		} catch (e) {
			// ignore parse error
		}
	}

	res.json({
		available: !conflict && inventoryAvailable,
		conflict_id: conflict?._id || null,
		inventory_issue: !inventoryAvailable ? itemName : null
	});
});

exports.verifyReturns = asyncHandler(async (req, res) => {
	const booking = await Booking.findById(req.params.id);
	if (!booking) return res.status(404).json({ message: "Booking not found" });

	const { returns } = req.body;
	if (!Array.isArray(returns)) {
		return res.status(400).json({ message: "Returns data must be an array" });
	}

	const currentReturns = booking.equipment_returns || [];
	const Inventory = require("../models/Inventory");

	for (const returnData of returns) {
		const { inventory_id, quantity_returned } = returnData;
		
		let existingRecord = currentReturns.find(r => r.inventory_id && r.inventory_id.toString() === inventory_id);
		
		if (!existingRecord) {
			const bookedItem = (booking.inventory_items || []).find(i => i.inventory_id && i.inventory_id.toString() === inventory_id);
			if (bookedItem) {
				existingRecord = {
					inventory_id: bookedItem.inventory_id,
					name: bookedItem.name,
					quantity_booked: bookedItem.quantity,
					quantity_returned: 0
				};
				currentReturns.push(existingRecord);
			}
		}

		if (existingRecord) {
			const oldReturned = existingRecord.quantity_returned || 0;
			const newReturned = Number(quantity_returned) || 0;
			
			let delta = 0;
			if (!existingRecord.verified_at) {
				delta = newReturned - (existingRecord.quantity_booked || 0);
			} else {
				delta = newReturned - oldReturned;
			}

			if (delta !== 0) {
				const invItem = await Inventory.findById(inventory_id);
				if (invItem) {
					invItem.quantity = Math.max(0, (invItem.quantity || 0) + delta);
					await invItem.save();
				}
			}
			
			existingRecord.quantity_returned = newReturned;
			existingRecord.verified_at = new Date();
			existingRecord.verified_by = req.user._id;
		}
	}

	booking.equipment_returns = currentReturns;
	await booking.save();

	await logAction({
		user_id: req.user._id,
		action: "booking_returns_verified",
		entity_type: "booking",
		entity_id: booking._id,
		details: `Verified equipment returns for booking #${booking._id}`,
		ip_address: req.ip
	});

	res.json(booking);
});