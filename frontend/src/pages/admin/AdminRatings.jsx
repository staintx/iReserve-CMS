import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminRatings() {
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    AdminAPI.getRatings().then((res) => setRatings(res.data));
  }, []);

  return (
    <AdminLayout>
      <h1>Customer Ratings</h1>
      <div className="panel">
        {ratings.map((r) => (
          <div key={r._id} className="list-item">
            {r.review} — {r.stars}★
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}