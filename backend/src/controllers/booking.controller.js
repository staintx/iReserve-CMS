const Booking = require("../models/Booking");
const Inquiry = require("../models/Inquiry");
const asyncHandler = require("../utils/asyncHandler");

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
		status: "active",
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

	res.status(201).json(await Booking.create(req.body));
});

exports.createFromInquiry = asyncHandler(async (req, res) => {
	const inquiry = await Inquiry.findById(req.params.id);
	if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
	if (req.body.total_price === undefined) {
		return res.status(400).json({ message: "Total price is required" });
	}

	const bookingPayload = {
		customer_id: inquiry.customer_id,
		inquiry_id: inquiry._id,
		event_type: inquiry.event_type,
		event_theme: inquiry.event_theme,
		event_date: inquiry.event_date,
		start_time: inquiry.start_time,
		guest_count: inquiry.guest_count,
		duration_hours: inquiry.duration_hours,
		include_food: inquiry.include_food,
		venue_type: inquiry.venue_type,
		indoor_outdoor: inquiry.indoor_outdoor,
		province: inquiry.province,
		municipality: inquiry.municipality,
		barangay: inquiry.barangay,
		street: inquiry.street,
		landmark: inquiry.landmark,
		zip_code: inquiry.zip_code,
		venue_contact_name: inquiry.venue_contact_name,
		venue_contact_phone: inquiry.venue_contact_phone,
		selected_menu: inquiry.selected_menu,
		dietary_restrictions: inquiry.dietary_restrictions,
		allergies: inquiry.allergies,
		special_requests: inquiry.special_requests,
		additional_services: inquiry.additional_services,
		contact_first_name: inquiry.contact_first_name,
		contact_last_name: inquiry.contact_last_name,
		contact_email: inquiry.contact_email,
		contact_phone: inquiry.contact_phone,
		contact_alt_phone: inquiry.contact_alt_phone,
		contact_method: inquiry.contact_method,
		payment_method: inquiry.payment_method,
		total_price: req.body.total_price,
		package_id: req.body.package_id || inquiry.package_id,
		manager_id: req.body.manager_id,
		staff_ids: req.body.staff_ids,
		status: req.body.status || "active"
	};

	const conflict = await findBookingConflict({
		eventDate: bookingPayload.event_date,
		startTime: bookingPayload.start_time,
		durationHours: bookingPayload.duration_hours,
		location: bookingPayload,
		bufferMinutes: req.body.buffer_minutes
	});
	if (conflict) {
		return res.status(409).json({
			message: "Booking conflict detected for the selected date/time",
			conflict_id: conflict._id
		});
	}

	const booking = await Booking.create(bookingPayload);
	await Inquiry.findByIdAndUpdate(inquiry._id, { status: "approved" }, { new: true });
	res.status(201).json(booking);
});

exports.getAll = asyncHandler(async (req, res) => {
	res.json(await Booking.find().populate("customer_id package_id manager_id staff_ids inquiry_id"));
});

exports.getMine = asyncHandler(async (req, res) => {
	res.json(await Booking.find({ customer_id: req.user._id }).populate("customer_id package_id manager_id staff_ids inquiry_id"));
});

exports.getById = asyncHandler(async (req, res) => {
	res.json(await Booking.findById(req.params.id).populate("customer_id package_id manager_id staff_ids inquiry_id"));
});

exports.update = asyncHandler(async (req, res) => {
	const current = await Booking.findById(req.params.id);
	if (!current) return res.status(404).json({ message: "Booking not found" });

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

	res.json(await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

exports.remove = asyncHandler(async (req, res) => {
	await Booking.findByIdAndDelete(req.params.id);
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

	res.json({
		available: !conflict,
		conflict_id: conflict?._id || null
	});
});