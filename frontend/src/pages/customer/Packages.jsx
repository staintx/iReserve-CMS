import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [filterType, setFilterType] = useState("All");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [appliedPriceMin, setAppliedPriceMin] = useState("");
  const [appliedPriceMax, setAppliedPriceMax] = useState("");
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
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

  const getEventType = (data) => {
    if (data?.event_type) return data.event_type;
    const name = (data?.name || "").toLowerCase();
    if (name.includes("birthday")) return "Birthday";
    if (name.includes("wedding")) return "Wedding";
    if (name.includes("corporate")) return "Corporate";
    return "";
  };

  useEffect(() => {
    CustomerAPI.getPackages().then((res) => {
      const next = Array.isArray(res.data) ? res.data : [];
      setPackages(next.filter((pkg) => pkg?.available !== false));
    });
  }, []);

  const eventTypes = ["All", ...new Set(packages.map(p => p.event_type).filter(Boolean))];
  
  const filteredPackages = packages.filter(p => {
    if (filterType !== "All" && p.event_type !== filterType) return false;
    
    if (appliedPriceMin !== "") {
      const pMin = Number(p.price_min);
      const pMax = Number(p.price_max);
      const maxPossiblePrice = Number.isFinite(pMax) ? pMax : (Number.isFinite(pMin) ? pMin : null);
      if (maxPossiblePrice !== null && maxPossiblePrice < Number(appliedPriceMin)) return false;
    }
    
    if (appliedPriceMax !== "") {
      const pMin = Number(p.price_min);
      const pMax = Number(p.price_max);
      const minPossiblePrice = Number.isFinite(pMin) ? pMin : (Number.isFinite(pMax) ? pMax : null);
      if (minPossiblePrice !== null && minPossiblePrice > Number(appliedPriceMax)) return false;
    }
    
    return true;
  });

  const handleApplyPrice = () => {
    setAppliedPriceMin(priceMin);
    setAppliedPriceMax(priceMax);
    setIsPriceFilterOpen(false);
  };

  const handleClearFilters = () => {
    setFilterType("All");
    setPriceMin("");
    setPriceMax("");
    setAppliedPriceMin("");
    setAppliedPriceMax("");
    setIsPriceFilterOpen(false);
  };

  return (
    <CustomerLayout>
      <div className="banner">
        <h1>Event Packages Overview</h1>
        <p>Choose from our carefully curated packages.</p>
      </div>

      <div style={{ 
        display: "flex", 
        flexWrap: "wrap", 
        justifyContent: "center", 
        alignItems: "center", 
        gap: "10px", 
        padding: "20px 0" 
      }}>
        {/* Event Type Chips */}
        {eventTypes.map(type => (
          <button 
            key={type} 
            type="button"
            className={filterType === type ? "btn" : "btn-outline"}
            onClick={() => setFilterType(type)}
            style={{ borderRadius: "20px", padding: "8px 16px", fontSize: "14px" }}
          >
            {type}
          </button>
        ))}

        {/* Subtle Vertical Divider */}
        <div style={{ width: "1px", height: "24px", backgroundColor: "#ddd", margin: "0 4px" }} />

        {/* Price Filter Dropdown */}
        <div style={{ position: "relative" }}>
          <button 
            type="button"
            className="btn-outline" 
            onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
            style={{ borderRadius: "20px", padding: "8px 16px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}
          >
            Price Filter
            <span style={{ fontSize: "10px" }}>{isPriceFilterOpen ? "▲" : "▼"}</span>
          </button>

          {isPriceFilterOpen && (
            <div style={{ 
              position: "absolute", 
              top: "100%", 
              left: "50%",
              transform: "translateX(-50%)",
              marginTop: "10px", 
              background: "var(--card-bg, #fff)", 
              borderRadius: "8px", 
              padding: "20px", 
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 10,
              width: "260px",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              border: "1px solid #eee"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid #ccc", borderRadius: "6px", padding: "0 8px", flex: 1 }}>
                  <span style={{ color: "#666" }}>₱</span>
                  <input 
                    type="number" 
                    placeholder="Min" 
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    style={{ border: "none", outline: "none", padding: "8px", width: "100%", fontSize: "14px" }}
                  />
                </div>
                <span style={{ color: "#666" }}>-</span>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid #ccc", borderRadius: "6px", padding: "0 8px", flex: 1 }}>
                  <span style={{ color: "#666" }}>₱</span>
                  <input 
                    type="number" 
                    placeholder="Max" 
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    style={{ border: "none", outline: "none", padding: "8px", width: "100%", fontSize: "14px" }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  type="button"
                  className="btn" 
                  onClick={handleApplyPrice}
                  style={{ flex: 1, padding: "8px", borderRadius: "6px", fontSize: "14px" }}
                >
                  Apply
                </button>
                <button 
                  type="button"
                  className="btn-outline" 
                  onClick={() => {
                    setPriceMin("");
                    setPriceMax("");
                    setAppliedPriceMin("");
                    setAppliedPriceMax("");
                  }}
                  style={{ flex: 1, padding: "8px", borderRadius: "6px", fontSize: "14px" }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {filteredPackages.length === 0 ? (
        <div style={{ 
          textAlign: "center", 
          padding: "60px 20px", 
          margin: "20px 0"
        }}>
          <h3 style={{ margin: "0 0 10px 0", color: "var(--text-color, #333)", fontWeight: "500" }}>No packages found</h3>
          <p style={{ color: "#666", margin: 0 }}>Try adjusting your filters or clearing them to see all packages.</p>
          <button 
            type="button"
            className="btn-outline" 
            onClick={handleClearFilters}
            style={{ marginTop: "20px", borderRadius: "20px", padding: "8px 24px" }}
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="package-grid">
          {filteredPackages.map((p) => (
            <div className="card package-card" key={p._id}>
              <img src={p.image_url} alt={p.name} />
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <small>₱{formatMoney(getPackagePrice(p))}</small>
              <div className="actions">
                <button className="btn-outline" onClick={() => navigate(`/packages/${p._id}`)}>View Full Details</button>
                <button className="btn" onClick={() => navigate("/customer/book", { state: { eventType: getEventType(p) } })}>Book Now</button>
              </div>
            </div>
          ))}
        </div>
      )}

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