import CustomerLayout from "../../../components/layout/CustomerLayout";

export default function BookingSuccess() {
  return (
    <CustomerLayout>
      <div className="success-card">
        <h2>Booking Request Submitted!</h2>
        <p>We will contact you within 24 hours to confirm your booking.</p>
        <div className="actions">
          <button className="btn">Return to Home</button>
          <button className="btn-outline">View My Inquiry</button>
        </div>
      </div>
    </CustomerLayout>
  );
}