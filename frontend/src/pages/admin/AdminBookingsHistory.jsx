import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminBookingsHistoryTable from "../../components/tables/AdminBookingsHistoryTable";

export default function AdminBookingsHistory() {
  const [bookings, setBookings] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    AdminAPI.getBookings()
      .then((res) => {
        setBookings(res.data.filter((b) => b.status !== "active"));
      })
      .catch(() => setBookings([]));
  }, []);

  const filtered = bookings.filter((booking) => {
    const text = `${booking._id || ""} ${booking.event_type || ""} ${booking.customer_id?.full_name || ""}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <AdminLayout>
      <h1>Event History</h1>
      <div className="admin-actions" style={{ marginBottom: "12px" }}>
        <div className="admin-search">
          <input placeholder="Search by client name, booking ID, or event type..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="panel">
        <AdminBookingsHistoryTable
          bookings={filtered}
          onView={(booking) => navigate(`/admin/bookings/${booking._id}/details`)}
        />
      </div>
    </AdminLayout>
  );
}