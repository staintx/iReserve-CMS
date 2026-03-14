import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";

export default function PackageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);

  useEffect(() => {
    CustomerAPI.getPackageById(id).then((res) => setPkg(res.data));
  }, [id]);

  if (!pkg) return null;

  const formatMoney = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("en-PH") : value || "";
  };

  const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
  const addOns = Array.isArray(pkg.add_ons) ? pkg.add_ons : [];
  const cancellationPolicy = pkg.cancellation_policy || "Flexible rescheduling within 7 days of the event date.";
  const bookingRequirements = pkg.booking_requirements || "Valid ID and 30% down payment required to confirm.";

  return (
    <CustomerLayout>
      <div className="package-details-page">
        <div className="package-hero" style={{ backgroundImage: `url(${pkg.image_url})` }}>
          <div className="package-hero-overlay">
            <button className="package-back" type="button" onClick={() => navigate("/packages")}>
              Back to Packages
            </button>
            <p className="package-hero-kicker">Caezelle's Catering</p>
            <h1 className="package-hero-title">{pkg.name}</h1>
            <p className="package-hero-subtitle">{pkg.description}</p>
            <div className="package-hero-meta">
              <span className="package-pill">Size: {pkg.size || "Custom"}</span>
              <span className="package-pill">From ₱{formatMoney(pkg.price_min)}</span>
              <span className="package-pill">{pkg.rating || "4.5"} ★</span>
            </div>
          </div>
        </div>

        <div className="package-detail-grid">
          <section className="package-panel">
            <div className="package-section">
              <h2>About This Package</h2>
              <p className="package-body">{pkg.description}</p>
              <div className="package-policy-grid">
                <div className="package-policy-card">
                  <h4>Cancellation Policy</h4>
                  <p>{cancellationPolicy}</p>
                </div>
                <div className="package-policy-card">
                  <h4>Booking Requirements</h4>
                  <p>{bookingRequirements}</p>
                </div>
              </div>
            </div>

            <div className="package-section">
              <div className="package-section-header">
                <h2>Services & Inclusions</h2>
                <span>{inclusions.length || "0"} items</span>
              </div>
              <div className="package-list-grid">
                {inclusions.length ? (
                  inclusions.map((item) => (
                    <div className="package-list-item" key={item}>
                      <span className="package-dot" />
                      <span>{item}</span>
                    </div>
                  ))
                ) : (
                  <div className="package-empty">Inclusions will be tailored based on your event needs.</div>
                )}
              </div>
            </div>

            <div className="package-section">
              <div className="package-section-header">
                <h2>Add Ons</h2>
                <span>{addOns.length || "0"} options</span>
              </div>
              <div className="package-list-grid">
                {addOns.length ? (
                  addOns.map((item) => (
                    <div className="package-list-item" key={item}>
                      <span className="package-dot" />
                      <span>{item}</span>
                    </div>
                  ))
                ) : (
                  <div className="package-empty">Let us know if you want additional services or items.</div>
                )}
              </div>
            </div>
          </section>

          <aside className="package-side">
            <div className="price-card">
              <p className="price-label">Package Price</p>
              <h2>₱{formatMoney(pkg.price_min)} - ₱{formatMoney(pkg.price_max)}</h2>
              <div className="price-meta">
                <div className="price-meta-item">
                  <span>Serving Size</span>
                  <strong>{pkg.size || "Custom"}</strong>
                </div>
                <div className="price-meta-item">
                  <span>Duration</span>
                  <strong>{pkg.duration || "4 hours"}</strong>
                </div>
                <div className="price-meta-item">
                  <span>Availability</span>
                  <strong>{pkg.available ? "Open" : "Limited"}</strong>
                </div>
              </div>
              <button className="btn" onClick={() => navigate("/customer/book")}>Book Now</button>
              <button className="btn-outline" onClick={() => navigate("/customer/quote")}>Request Custom Quote</button>
            </div>

            <div className="package-note-card">
              <h4>Need help deciding?</h4>
              <p>Send us your event details and we will tailor the package to match your theme and guests.</p>
              <button className="btn-outline" onClick={() => navigate("/customer/messages")}>Message Us</button>
            </div>
          </aside>
        </div>

        <section className="package-cta">
          <div>
            <h2>Ready to Book?</h2>
            <p>We will confirm availability and secure your date within 24 hours.</p>
          </div>
          <div className="package-cta-actions">
            <button className="btn" onClick={() => navigate("/customer/book")}>Book Now</button>
            <button className="btn-outline" onClick={() => navigate("/customer/quote")}>Request Custom Quote</button>
          </div>
        </section>
      </div>
    </CustomerLayout>
  );
}