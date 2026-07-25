import { useLocation, useNavigate } from "react-router-dom";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import useAuth from "../../../hooks/useAuth";

export default function BookingSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { booking } = location.state || {};

  if (!booking) {
    return (
      <CustomerLayout>
        <div style={{ textAlign: "center", padding: "40px" }}>
          <h2>No booking details found.</h2>
          <button className="btn" onClick={() => navigate("/customer/home")}>Go Home</button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="booking-success">
        <div className="success-icon">OK</div>
        <h2>Booking Request Submitted!</h2>
        <p>Thank you for choosing Caezelle's Catering. We received your booking request and will contact you shortly.</p>

        <div className="success-summary">
          <h4>Booking Summary</h4>
          <div className="summary-grid">
            <div>
              <span>Event Type:</span>
              <strong>{booking.event_type}</strong>
            </div>
            <div>
              <span>Event Date:</span>
              <strong>{new Date(booking.event_date).toLocaleDateString()}</strong>
            </div>
            <div>
              <span>Event Duration:</span>
              <strong>{booking.duration_hours || 4} hours</strong>
            </div>
            <div>
              <span>Venue:</span>
              <strong>{booking.venue_type}</strong>
            </div>
            <div>
              <span>Reference ID:</span>
              <strong>{booking.reference || booking._id}</strong>
            </div>
          </div>
        </div>

        <div className="success-total">
          <h4>Estimated Total Price</h4>
          <div className="total-row total-bold">
            <span>Total Package Price</span>
            <strong>₱{(booking.total_price || 0).toLocaleString()}</strong>
          </div>
        </div>

        <p className="success-note">
          A confirmation email has been sent to {booking.contact_email || user?.email || "your email"}.
        </p>

        <div className="actions">
          <button className="btn" onClick={() => navigate("/customer/bookings")}>View My Bookings</button>
          <button className="btn-outline" onClick={() => navigate("/customer/home")}>Return to Home</button>
        </div>
      </div>
    </CustomerLayout>
  );
}