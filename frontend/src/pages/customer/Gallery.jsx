import { useEffect, useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";

export default function Gallery() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    CustomerAPI.getGallery().then((res) => setItems(res.data));
  }, []);

  return (
    <CustomerLayout>
      <div className="banner">
        <h1>Our Gallery</h1>
        <p>Explore our collection of beautifully crafted events</p>
      </div>

      <div className="grid gallery-grid">
        {items.map((g) => (
          <div className="card gallery-card" key={g._id}>
            <img src={g.image_url} alt={g.title} />
            <span>{g.title}</span>
          </div>
        ))}
      </div>

      <section className="cta">
        <h2>Ready to Create Your Own Event?</h2>
        <button className="btn">Get Started Now</button>
      </section>
    </CustomerLayout>
  );
}