const Booking = require("../models/Booking");
const Inquiry = require("../models/Inquiry");
const asyncHandler = require("../utils/asyncHandler");

exports.create = asyncHandler(async (req, res) => {
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
	res.json(await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

exports.remove = asyncHandler(async (req, res) => {
	await Booking.findByIdAndDelete(req.params.id);
	res.json({ message: "Deleted" });
});