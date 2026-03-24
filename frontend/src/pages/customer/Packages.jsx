import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const navigate = useNavigate();

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

  useEffect(() => {
    CustomerAPI.getPackages().then((res) => {
      const next = Array.isArray(res.data) ? res.data : [];
      setPackages(next.filter((pkg) => pkg?.available !== false));
    });
  }, []);

  return (
    <CustomerLayout>
      <div className="banner">
        <h1>Event Packages Overview</h1>
        <p>Choose from our carefully curated packages.</p>
      </div>

      <div className="package-grid">
        {packages.map((p) => (
          <div className="card package-card" key={p._id}>
            <img src={p.image_url} alt={p.name} />
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <small>₱{formatMoney(getPackagePrice(p))}</small>
            <div className="actions">
              <button className="btn-outline" onClick={() => navigate(`/packages/${p._id}`)}>View Full Details</button>
              <button className="btn" onClick={() => navigate("/customer/book")}>Book Now</button>
            </div>
          </div>
        ))}
      </div>

      <section className="section centered">
        <h2>Why Choose Caezelle’s?</h2>
        <div className="grid icons">
          <div className="icon-card">Expert Chefs</div>
          <div className="icon-card">Quality Guaranteed</div>
          <div className="icon-card">Professional Staff</div>
          <div className="icon-card">5‑Star Reviews</div>
        </div>
      </section>

      <section className="cta">
        <h2>Need a Custom Package?</h2>
        <button className="btn" onClick={() => navigate("/customer/quote")}>Request Custom Quote</button>
      </section>
    </CustomerLayout>
  );
}