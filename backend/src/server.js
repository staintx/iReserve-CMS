const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cookie = require("cookie");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/error.middleware");
const { verifyEmailConnection } = require("./utils/email");
const User = require("./models/User");
const Conversation = require("./models/Conversation");
const { canAccessConversation } = require("./utils/chatAccess");

const authRoutes = require("./routes/auth.routes");

const bookingRoutes = require("./routes/booking.routes");
const paymentRoutes = require("./routes/payment.routes");
const packageRoutes = require("./routes/package.routes");
const menuRoutes = require("./routes/menu.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const galleryRoutes = require("./routes/gallery.routes");
const staffRoutes = require("./routes/staff.routes");
const reportRoutes = require("./routes/report.routes");
const ratingRoutes = require("./routes/rating.routes");
const systemLogRoutes = require("./routes/systemlog.routes");
const businessInfoRoutes = require("./routes/businessinfo.routes");
const userRoutes = require("./routes/user.routes");
const inquiryRoutes = require("./routes/inquiry.routes");
const quotationRoutes = require("./routes/quotation.routes");
const messageRoutes = require("./routes/message.routes");
const notificationRoutes = require("./routes/notification.routes");
const blockedDateRoutes = require("./routes/blockedDate.routes");
const addonRoutes = require("./routes/addonRoutes");
const startCronJobs = require("./jobs/cron");

connectDB();

const app = express();
const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ["http://localhost:5173"];
app.use(cors({
	origin: allowedOrigins,
	credentials: true
}));
app.use(express.json({
	verify: (req, res, buf) => {
		req.rawBody = buf.toString();
	}
}));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/", (req, res) => res.send("iReserve API Running ✅"));

app.use("/api/auth", authRoutes);

app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/manager", staffRoutes); // Alias for legacy manager routes
app.use("/api/reports", reportRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/systemlogs", systemLogRoutes);
app.use("/api/business-info", businessInfoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/blocked-dates", blockedDateRoutes);
app.use("/api/addons", addonRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
	cors: {
		origin: allowedOrigins,
		credentials: true
	}
});

app.set("io", io);

startCronJobs(io);

io.use(async (socket, next) => {
	try {
		const cookies = cookie.parse(socket.handshake.headers.cookie || "");
		const token = cookies.token;
		if (!token) return next(new Error("Missing token"));
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findById(decoded.id).select("-password");
		if (!user) return next(new Error("User not found"));
		socket.data.user = user;
		return next();
	} catch (err) {
		if (err.name === "TokenExpiredError") {
			return next(new Error("TOKEN_EXPIRED"));
		}
		return next(new Error("Invalid token"));
	}
});

io.on("connection", (socket) => {
	socket.join(`user:${socket.data.user._id}`);

	socket.on("conversation:join", async (conversationId, ack) => {
		try {
			const conversation = await Conversation.findById(conversationId);
			if (!conversation || !canAccessConversation(socket.data.user, conversation)) {
				if (ack) ack({ ok: false, message: "Forbidden" });
				return;
			}
			const room = `conversation:${conversationId}`;
			socket.join(room);
			if (ack) ack({ ok: true });
		} catch (err) {
			if (ack) ack({ ok: false, message: "Join failed" });
		}
	});

	socket.on("conversation:leave", (conversationId) => {
		socket.leave(`conversation:${conversationId}`);
	});

	socket.on("typing:start", (conversationId) => {
		const payload = {
			user_id: socket.data.user?._id,
			name: socket.data.user?.full_name || socket.data.user?.email || "User"
		};
		socket.to(`conversation:${conversationId}`).emit("typing:start", payload);
	});

	socket.on("typing:stop", (conversationId) => {
		const payload = { user_id: socket.data.user?._id };
		socket.to(`conversation:${conversationId}`).emit("typing:stop", payload);
	});
});

const { verifyPayMongoConfig } = require("./services/payment.service");

server.listen(PORT, () => {
  console.log(` Server on port ${PORT}`);
  // Verify SMTP connection on startup so issues appear in deploy logs
  verifyEmailConnection();
  verifyPayMongoConfig();
});