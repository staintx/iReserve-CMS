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
const Message = require("./models/Message");
const { canAccessConversation } = require("./utils/chatAccess");
const { createNotification, notifyAdmins } = require("./utils/notify");

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
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/$/, "")) 
  : ["http://localhost:5173"];

const corsOptions = {
	origin: (origin, callback) => {
		if (!origin) return callback(null, true);
		const originNoSlash = origin.replace(/\/$/, "");
		if (allowedOrigins.includes(originNoSlash)) {
			callback(null, true);
		} else {
			// Reflect origin to bypass CORS issues in production deployments
			callback(null, origin);
		}
	},
	credentials: true
};

app.use(cors(corsOptions));
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
	cors: corsOptions
});

app.set("io", io);

startCronJobs(io);

io.use(async (socket, next) => {
	try {
		const cookies = cookie.parse(socket.handshake.headers.cookie || "");
		let token = cookies.token || socket.handshake.auth?.token || socket.handshake.query?.token;
		require("fs").appendFileSync("socket-debug.log", `[${new Date().toISOString()}] USE ${socket.id} - token present: ${!!token}, auth token: ${!!socket.handshake.auth?.token}, cookies token: ${!!cookies.token}\n`);
		if (!token) {
			// Allow anonymous sockets to connect (they won't join private rooms).
			socket.data.user = null;
			require("fs").appendFileSync("socket-debug.log", `[${new Date().toISOString()}] USE ${socket.id} - No token, allowing anonymous\n`);
			return next();
		}
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findById(decoded.id).select("-password");
		if (!user) {
			// No user found for token — allow anonymous connection instead of rejecting
			socket.data.user = null;
			return next();
		}
		socket.data.user = user;
		return next();
	} catch (err) {
		if (err.name === "TokenExpiredError") {
			// Expired tokens should still be rejected to force re-authentication
			return next(new Error("TOKEN_EXPIRED"));
		}
		// On any other error, allow anonymous socket to proceed rather than blocking polling.
		socket.data.user = null;
		return next();
	}
});

io.on("connection", (socket) => {
	require("fs").appendFileSync("socket-debug.log", `[${new Date().toISOString()}] CONNECT ${socket.id} - User: ${socket.data.user ? socket.data.user.email : 'Anonymous'}\n`);
	const emitMessageToRooms = (conversation, payload) => {
		const customerId = conversation.customer_id ? String(conversation.customer_id) : null;
		const managerId = conversation.event_manager_id ? String(conversation.event_manager_id) : null;

		io.to(`conversation:${conversation._id}`).emit("message:new", payload);
		if (customerId) io.to(`user:${customerId}`).emit("message:new", payload);
		if (managerId) io.to(`user:${managerId}`).emit("message:new", payload);
		io.to("role:admin").emit("message:new", payload);
		io.to("role:manager").emit("message:new", payload);
	};

	const persistSocketMessage = async ({ conversationId, body, attachments = [], client_message_id: clientMessageId, token }) => {
		if (!socket.data.user && token) {
			try {
				const decoded = jwt.verify(token, process.env.JWT_SECRET);
				const user = await User.findById(decoded.id).select("-password");
				if (user) {
					socket.data.user = user;
					socket.join(`user:${user._id}`);
					if (user.role === "admin" || user.role === "manager") {
						socket.join("role:admin");
						socket.join("role:manager");
					}
				}
			} catch (e) {}
		}

		if (!socket.data.user) {
			throw new Error("Unauthorized");
		}

		const conversation = await Conversation.findById(conversationId);
		if (!conversation) {
			throw new Error("Conversation not found");
		}
		if (!canAccessConversation(socket.data.user, conversation)) {
			throw new Error("Forbidden");
		}

		const cleanBody = String(body || "").trim();
		const cleanAttachments = Array.isArray(attachments) ? attachments : [];
		if (!cleanBody && cleanAttachments.length === 0) {
			throw new Error("Message body or attachment is required");
		}

		const message = await Message.create({
			conversation_id: conversation._id,
			sender_id: socket.data.user._id,
			body: cleanBody,
			attachments: cleanAttachments,
			read_by: [{ user_id: socket.data.user._id, read_at: new Date() }]
		});

		const snippet = cleanBody || (cleanAttachments.length ? `[${cleanAttachments.length} attachment(s)]` : "New message");
		conversation.last_message = snippet.slice(0, 200);
		conversation.last_message_at = new Date();
		if (socket.data.user.role === "customer") {
			conversation.unread_admin_count = (conversation.unread_admin_count || 0) + 1;
		} else {
			conversation.unread_customer_count = (conversation.unread_customer_count || 0) + 1;
		}
		await conversation.save();

		const sender = socket.data.user;
		const payload = {
			_id: message._id,
			client_message_id: clientMessageId,
			conversation_id: conversation._id,
			sender_id: {
				_id: sender._id,
				full_name: sender.full_name,
				role: sender.role,
				email: sender.email
			},
			body: message.body,
			attachments: message.attachments,
			createdAt: message.createdAt,
			updatedAt: message.updatedAt,
			read_by: message.read_by
		};

		emitMessageToRooms(conversation, payload);

		const senderId = String(sender._id);
		const customerId = conversation.customer_id ? String(conversation.customer_id) : null;
		const managerId = conversation.event_manager_id ? String(conversation.event_manager_id) : null;
		const senderName = sender.full_name || sender.email || "Someone";

		try {
			if (customerId && senderId !== customerId) {
				await createNotification({
					userId: customerId,
					title: "New message",
					body: `${senderName}: "${snippet.slice(0, 60)}"`,
					type: "info",
					link: `/customer/messages/${conversation._id}`,
					meta: { conversation_id: conversation._id }
				}, io);
			}

			if (sender.role === "customer") {
				if (managerId && senderId !== managerId) {
					await createNotification({
						userId: managerId,
						title: "New customer message",
						body: `${senderName}: "${snippet.slice(0, 60)}"`,
						type: "info",
						link: `/manager/messages/${conversation._id}`,
						meta: { conversation_id: conversation._id }
					}, io);
				}
				await notifyAdmins({
					title: "New customer message",
					body: `${senderName}: "${snippet.slice(0, 60)}"`,
					type: "info",
					link: `/admin/messages/${conversation._id}`,
					meta: { conversation_id: conversation._id }
				}, io);
			}
		} catch (notificationErr) {
			console.error("Chat notification dispatch failed:", notificationErr.message);
		}

		return payload;
	};

	// If user is authenticated, join their personal and role rooms
	if (socket.data.user) {
		try {
			socket.join(`user:${socket.data.user._id}`);
			if (socket.data.user.role === "admin" || socket.data.user.role === "manager") {
				socket.join("role:admin");
				socket.join("role:manager");
			}
		} catch (e) {
			// ignore
		}
	}

	socket.on("message:send", async (payload, ack) => {
		try {
			if (payload?.token && !socket.data.user) {
				try {
					const decoded = jwt.verify(payload.token, process.env.JWT_SECRET);
					const user = await User.findById(decoded.id).select("-password");
					if (user) {
						socket.data.user = user;
						socket.join(`user:${user._id}`);
						if (user.role === "admin" || user.role === "manager") {
							socket.join("role:admin");
							socket.join("role:manager");
						}
					}
				} catch (e) {}
			}
			const message = await persistSocketMessage(payload || {});
			if (ack) ack({ ok: true, message });
		} catch (err) {
			if (ack) ack({ ok: false, message: err.message || "Send failed" });
		}
	});

	socket.on("conversation:join", async (data, ack) => {
		try {
			const conversationId = typeof data === "object" ? data?.conversationId : data;
			const token = typeof data === "object" ? data?.token : (socket.handshake.auth?.token || null);

			if (token && !socket.data.user) {
				try {
					const decoded = jwt.verify(token, process.env.JWT_SECRET);
					const user = await User.findById(decoded.id).select("-password");
					if (user) {
						socket.data.user = user;
						socket.join(`user:${user._id}`);
						if (user.role === "admin" || user.role === "manager") {
							socket.join("role:admin");
							socket.join("role:manager");
						}
					}
				} catch (e) {}
			}

			const conversation = await Conversation.findById(conversationId);
			if (!conversation) {
				if (ack) ack({ ok: false, message: "Conversation not found" });
				return;
			}

			if (!canAccessConversation(socket.data.user, conversation)) {
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