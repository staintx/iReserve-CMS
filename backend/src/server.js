const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/error.middleware");

const authRoutes = require("./routes/auth.routes");
const inquiryRoutes = require("./routes/inquiry.routes");
const bookingRoutes = require("./routes/booking.routes");
const paymentRoutes = require("./routes/payment.routes");
const packageRoutes = require("./routes/package.routes");
const menuRoutes = require("./routes/menu.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const galleryRoutes = require("./routes/gallery.routes");
const staffRoutes = require("./routes/staff.routes");
const managerRoutes = require("./routes/manager.routes");
const reportRoutes = require("./routes/report.routes");
const ratingRoutes = require("./routes/rating.routes");
const systemLogRoutes = require("./routes/systemlog.routes");
const userRoutes = require("./routes/user.routes");
const quoteRoutes = require("./routes/quote.routes");

connectDB();

const app = express();
const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ["http://localhost:5173"];
app.use(cors({
	origin: allowedOrigins,
	credentials: true
}));
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.send("iReserve API Running ✅"));

app.use("/api/auth", authRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/systemlogs", systemLogRoutes);
app.use("/api/users", userRoutes);
app.use("/api/quotes", quoteRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(` Server on port ${PORT}`));