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

  return (
    <CustomerLayout>
      <div className="package-hero" style={{ backgroundImage: `url(${pkg.image_url})` }}>
        <h1>{pkg.name}</h1>
        <p>Size {pkg.size} • {pkg.rating || "4.5"} ★</p>
      </div>

      <div className="package-detail-grid">
        <div className="price-card">
          <h2>₱{pkg.price_min} - ₱{pkg.price_max}</h2>
          <p>Size: {pkg.size}</p>
          <p>Duration: {pkg.duration || "4 hours"}</p>
          <button className="btn" onClick={() => navigate("/customer/book")}>Book Now</button>
          <button className="btn-outline" onClick={() => navigate("/customer/quote")}>Request Custom Quote</button>
        </div>

        <div className="about-card">
          <h3>About This Package</h3>
          <p>{pkg.description}</p>
          <div className="mini-cards">
            <div className="mini-card">Cancellation Policy</div>
            <div className="mini-card">Booking Requirements</div>
          </div>
        </div>
      </div>

      <section className="section">
        <h3>Services & Inclusions</h3>
        <div className="grid two">
          <div className="card">Event Setup & Furniture</div>
          <div className="card">Dining & Service Inventory</div>
        </div>
      </section>

      <section className="section">
        <h3>Adds On</h3>
        <div className="grid">
          <div className="card">Host</div>
          <div className="card">Videoke</div>
          <div className="card">Candy Corner</div>
        </div>
      </section>

      <section className="cta">
        <h2>Ready to Book?</h2>
        <button className="btn" onClick={() => navigate("/customer/book")}>Book Now</button>
        <button className="btn-outline" onClick={() => navigate("/customer/quote")}>Request Custom Quote</button>
      </section>
    </CustomerLayout>
  );
}