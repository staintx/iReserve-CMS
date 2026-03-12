import { useEffect, useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";

export default function CustomerMenu() {
  const [menu, setMenu] = useState([]);

  useEffect(() => {
    CustomerAPI.getMenu().then((res) => setMenu(res.data));
  }, []);

  return (
    <CustomerLayout>
      <h1>Food Menu</h1>
      <div className="grid">
        {menu.map((m) => (
          <div className="card" key={m._id}>
            <h4>{m.name}</h4>
            <p>{m.description}</p>
            <small>{m.category}</small>
          </div>
        ))}
      </div>
    </CustomerLayout>
  );
}