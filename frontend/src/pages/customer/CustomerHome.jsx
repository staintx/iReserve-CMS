import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";

export default function CustomerHome() {
  const navigate = useNavigate();

  return (
    <CustomerLayout>
      <section className="hero">
        <div className="hero-text">
          <h1>Make Your Event Memorable with iReserve</h1>
          <p>
            From inquiries to bookings, we help you plan, customize, and manage
            your catering service in one place.
          </p>
          <div className="hero-actions">
            <button className="btn" onClick={() => navigate("/customer/book")}>Start Inquiry</button>
            <button className="btn-outline" onClick={() => navigate("/packages")}>View Packages</button>
          </div>
        </div>

        <div className="hero-card">
          <h3>Quick Inquiry</h3>
          <p>Tell us your event details and we’ll respond fast.</p>
          <button className="btn" onClick={() => navigate("/customer/book")}>Submit Inquiry</button>
        </div>
      </section>

      <section className="stats">
        <div className="stat-card">
          <h2>150+</h2>
          <p>Events Served</p>
        </div>
        <div className="stat-card">
          <h2>98%</h2>
          <p>Customer Satisfaction</p>
        </div>
        <div className="stat-card">
          <h2>30+</h2>
          <p>Package Options</p>
        </div>
      </section>

      <section className="features">
        <h2>Why Choose Us?</h2>
        <div className="grid">
          <div className="card">
            <h4>Easy Inquiry</h4>
            <p>Submit your event details in minutes.</p>
          </div>
          <div className="card">
            <h4>Flexible Packages</h4>
            <p>Choose from curated packages or customize.</p>
          </div>
          <div className="card">
            <h4>Reliable Service</h4>
            <p>Professional staff and organized scheduling.</p>
          </div>
        </div>
      </section>

      <section className="process">
        <h2>How It Works</h2>
        <ol>
          <li>Submit your inquiry with event details.</li>
          <li>Choose a package and menu.</li>
          <li>Confirm booking with payment.</li>
          <li>Enjoy a smooth event experience.</li>
        </ol>
      </section>

      <section className="cta">
        <h2>Ready to Plan Your Event?</h2>
        <p>Start your inquiry now and secure your preferred schedule.</p>
        <button className="btn" onClick={() => navigate("/customer/book")}>Book Now</button>
      </section>
    </CustomerLayout>
  );
}   