import { useEffect, useState } from "react";
import api from "../../api/axios";
import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminBookingsHistory() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.get("/bookings").then((res) => {
      setBookings(res.data.filter((b) => b.status !== "active"));
    });
  }, []);

  return (
    <AdminLayout>
      <h1>Event History</h1>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Event</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{b._id}</td>
                <td>{b.event_type}</td>
                <td>{new Date(b.event_date).toLocaleDateString()}</td>
                <td>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}