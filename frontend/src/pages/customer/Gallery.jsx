import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";

const FILTER_CATEGORIES = ["All", "Weddings", "Birthday", "Corporate Events", "Food Display"];

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    CustomerAPI.getGallery().then((res) => setItems(res.data));
  }, []);

  const filteredItems = useMemo(() => {
    if (activeCategory === "All") return items;
    return items.filter((item) => String(item.category || "").toLowerCase() === activeCategory.toLowerCase());
  }, [items, activeCategory]);

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const showPrevious = (event) => {
    event.stopPropagation();
    setLightboxIndex((current) => (current - 1 + filteredItems.length) % filteredItems.length);
  };
  const showNext = (event) => {
    event.stopPropagation();
    setLightboxIndex((current) => (current + 1) % filteredItems.length);
  };

  useEffect(() => {
    if (lightboxIndex === null) return;
    if (lightboxIndex < 0 || lightboxIndex >= filteredItems.length) {
      setLightboxIndex(null);
    }
  }, [filteredItems, lightboxIndex]);

  return (
    <CustomerLayout>
      <div className="banner">
        <h1>Our Gallery</h1>
        <p>Explore our collection of beautifully crafted events</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 py-6">
        {FILTER_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={category === activeCategory ? "btn" : "btn-outline"}
            onClick={() => setActiveCategory(category)}
            style={{ borderRadius: "20px", padding: "8px 16px", fontSize: "14px" }}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid gallery-grid">
        {filteredItems.length > 0 ? (
          filteredItems.map((g, index) => (
            <div
              className="card gallery-card"
              key={g._id}
              onClick={() => openLightbox(index)}
              style={{ cursor: "pointer" }}
            >
              <img src={g.image_url} alt={g.title} />
              <span>{g.title}</span>
            </div>
          ))
        ) : (
          <div className="mt-10 text-center text-slate-500">No images found for this category.</div>
        )}
      </div>

      {lightboxIndex !== null && filteredItems[lightboxIndex] && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <button className="lightbox-close" type="button" onClick={closeLightbox}>×</button>
          <button className="lightbox-nav prev" type="button" onClick={showPrevious}>‹</button>
          <img
            src={filteredItems[lightboxIndex].image_url}
            alt={filteredItems[lightboxIndex].title}
            className="lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
          <button className="lightbox-nav next" type="button" onClick={showNext}>›</button>
        </div>
      )}

      <section className="cta">
        <h2>Ready to Create Your Own Event?</h2>
        <button className="btn" type="button" onClick={() => navigate("/customer/book")}>Get Started Now</button>
      </section>
    </CustomerLayout>
  );
}