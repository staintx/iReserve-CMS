const Rating = require("../models/Rating");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");

exports.create = asyncHandler(async (req, res) => {
	const { booking_id, stars, review } = req.body;
	const customer_id = req.user?._id || req.body.customer_id;

	const numStars = Number(stars);
	if (!numStars || numStars < 1 || numStars > 5) {
		return res.status(400).json({ message: "Rating must be between 1 and 5 stars." });
	}

	if (booking_id) {
		const booking = await Booking.findById(booking_id);
		if (!booking) return res.status(404).json({ message: "Booking not found" });

		if (req.user?.role === "customer" && String(booking.customer_id) !== String(customer_id)) {
			return res.status(403).json({ message: "Forbidden: You can only review your own bookings." });
		}

		// Check if rating already exists for this booking & customer -> upsert
		let existing = await Rating.findOne({ booking_id, customer_id });
		if (existing) {
			existing.stars = numStars;
			existing.review = review || "";
			await existing.save();
			return res.json(existing);
		}
	}

	const rating = await Rating.create({
		customer_id,
		booking_id: booking_id || null,
		stars: numStars,
		review: review || ""
	});

	res.status(201).json(rating);
});

exports.getByBooking = asyncHandler(async (req, res) => {
	const { bookingId } = req.params;
	const rating = await Rating.findOne({ booking_id: bookingId }).populate("customer_id", "full_name first_name last_name");
	if (!rating) return res.status(404).json({ message: "No rating found for this booking" });
	res.json(rating);
});

exports.getAll = asyncHandler(async (req, res) => {
	res.json(await Rating.find().populate("customer_id booking_id").sort({ createdAt: -1 }));
});

exports.getById = asyncHandler(async (req, res) => {
	const rating = await Rating.findById(req.params.id).populate("customer_id booking_id");
	if (!rating) return res.status(404).json({ message: "Rating not found" });
	res.json(rating);
});

exports.remove = asyncHandler(async (req, res) => {
	await Rating.findByIdAndDelete(req.params.id);
	res.json({ message: "Deleted" });
});

exports.getPublic = asyncHandler(async (req, res) => {
	const ratings = await Rating.find()
		.select("stars review customer_id createdAt")
		.populate({ path: "customer_id", select: "full_name" })
		.sort({ createdAt: -1 });

	res.json(ratings);
});