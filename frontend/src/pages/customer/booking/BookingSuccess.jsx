import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../../components/layout/CustomerLayout";

export default function BookingSuccess() {
  const navigate = useNavigate();

  return (
    <CustomerLayout>
      <div className="booking-success">
        <div className="success-icon">OK</div>
        <h2>Booking Request Submitted!</h2>
        <p>Thank you for choosing Caezelle's Catering. We received your booking request and will contact you within 24 hours.</p>

        <div className="success-summary">
          <h4>Booking Summary</h4>
          <div className="summary-grid">
            <div>
              <span>Event Type:</span>
              <strong>Birthday</strong>
            </div>
            <div>
              <span>Event Date:</span>
              <strong>Pending</strong>
            </div>
            <div>
              <span>Event Duration:</span>
              <strong>Pending</strong>
            </div>
            <div>
              <span>Venue:</span>
              <strong>Pending</strong>
            </div>
            <div>
              <span>Package:</span>
              <strong>Selected Package</strong>
            </div>
          </div>
        </div>

        <div className="success-total">
          <h4>Estimated Total Price</h4>
          <div className="total-row">
            <span>Menu Customization</span>
            <strong>Pending</strong>
          </div>
          <div className="total-row">
            <span>Additional Services</span>
            <strong>Pending</strong>
          </div>
          <div className="total-row total-bold">
            <span>Estimated Total</span>
            <strong>TBD</strong>
          </div>
        </div>

        <p className="success-note">A confirmation email has been sent to you@example.com. Booking reference: CAZ-000000.</p>

        <div className="actions">
          <button className="btn" onClick={() => navigate("/customer/home")}>Return to Home</button>
          <button className="btn-outline" onClick={() => navigate("/customer/inquiries")}>View My Inquiry</button>
        </div>
      </div>
    </CustomerLayout>
  );
}