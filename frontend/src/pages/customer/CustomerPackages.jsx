import { useEffect, useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";

export default function CustomerPackages() {
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    CustomerAPI.getPackages().then((res) => {
      const next = Array.isArray(res.data) ? res.data : [];
      setPackages(next.filter((pkg) => pkg?.available !== false));
    });
  }, []);

  return (
    <CustomerLayout>
      <h1>Packages</h1>
      <div className="grid">
        {packages.map((p) => (
          <div className="card" key={p._id}>
            <h4>{p.name}</h4>
            <p>{p.description}</p>
            <small>{p.size}</small>
          </div>
        ))}
      </div>
    </CustomerLayout>
  );
}