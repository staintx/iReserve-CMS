import { useEffect, useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";

export default function Menu() {
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    CustomerAPI.getMenu().then((res) => setMenu(res.data));
  }, []);

  return (
    <CustomerLayout>
      <div className="banner">
        <h1>View our Menu for Your Event</h1>
        <p>Browse our extensive selection for your perfect catering package.</p>
      </div>

      <div className="grid menu-grid">
        {menu.map((m) => (
          <div className="card menu-card" key={m._id}>
            <img src={m.image_url} alt={m.name} />
            <h4>{m.name}</h4>
            <small>{m.category}</small>
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