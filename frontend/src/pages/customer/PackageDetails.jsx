import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";

export default function PackageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    let isMounted = true;

    CustomerAPI.getPackageById(id)
      .then((res) => {
        if (!isMounted) return;
        if (res?.data?.available === false) {
          navigate("/packages", { replace: true });
          return;
        }
        setPkg(res.data);
      })
      .catch(() => {
        if (!isMounted) return;
        navigate("/packages", { replace: true });
      });

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  if (!pkg) return null;

  const formatMoney = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("en-PH") : value || "";
  };

  const getPackagePrice = (data) => {
    const min = Number(data?.price_min);
    const max = Number(data?.price_max);
    if (Number.isFinite(min)) return min;
    if (Number.isFinite(max)) return max;
    return null;
  };

  const packagePrice = getPackagePrice(pkg);

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
              <span className="package-pill">₱{formatMoney(packagePrice)}</span>
              <span className="package-pill">{pkg.rating || "4.5"} ★</span>
            </div>
          </div>
        </div>

        <div className="package-detail-grid">
          <section className="package-panel">
            <div className="package-section">
              <h2>About This Package</h2>
              <p className="package-body">{pkg.fullDescription || pkg.description}</p>
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

              {pkg.gallery && pkg.gallery.length > 0 && (
                <div className="package-section">
                  <div className="package-section-header">
                    <h2>Gallery</h2>
                    <span>{pkg.gallery.length} photos</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px', marginTop: '15px' }}>
                    {pkg.gallery.map((imgUrl, idx) => (
                      <img 
                        key={idx} 
                        src={imgUrl} 
                        alt={`Gallery ${idx + 1}`} 
                        style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.2s' }} 
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} 
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} 
                        onClick={() => setLightboxIndex(idx)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>

          {lightboxIndex !== null && (
            <div className="lightbox-overlay" onClick={() => setLightboxIndex(null)}>
              <button className="lightbox-close" onClick={() => setLightboxIndex(null)}>×</button>
              <button className="lightbox-nav prev" onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + pkg.gallery.length) % pkg.gallery.length); }}>‹</button>
              <img src={pkg.gallery[lightboxIndex]} alt="Gallery Expanded" className="lightbox-image" onClick={e => e.stopPropagation()} />
              <button className="lightbox-nav next" onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % pkg.gallery.length); }}>›</button>
            </div>
          )}

          <aside className="package-side">
            <div className="price-card">
              <p className="price-label">Package Price</p>
              <h2>₱{formatMoney(packagePrice)}</h2>
              <div className="price-meta">
                <div className="price-meta-item">
                  <span>Serving Size</span>
                  <strong>{pkg.size || "Custom"}</strong>
                </div>
                {pkg.max_guests && (
                  <div className="price-meta-item">
                    <span>Max Guests</span>
                    <strong>{pkg.max_guests}</strong>
                  </div>
                )}
                {pkg.event_type && (
                  <div className="price-meta-item">
                    <span>Event Type</span>
                    <strong>{pkg.event_type}</strong>
                  </div>
                )}
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