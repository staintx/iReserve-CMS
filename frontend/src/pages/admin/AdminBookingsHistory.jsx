import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminBookingsHistoryTable from "../../components/tables/AdminBookingsHistoryTable";
import Modal from "../../components/common/Modal";

export default function AdminBookingsHistory() {
  const [bookings, setBookings] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    AdminAPI.getBookings().then((res) => {
      setBookings(res.data.filter((b) => b.status !== "active"));
    });
  }, []);

  const filtered = bookings.filter((booking) => {
    const text = `${booking.event_type || ""} ${booking.customer_id?.full_name || ""}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <AdminLayout>
      <h1>Event History</h1>
      <div className="admin-actions" style={{ marginBottom: "12px" }}>
        <div className="admin-search">
          <input placeholder="Search by client or event" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="panel">
        <AdminBookingsHistoryTable bookings={filtered} onView={setSelected} />
      </div>

      {selected && (
        <Modal title="Booking Details" onClose={() => setSelected(null)}>
          <div className="admin-modal">
            <p><strong>Event:</strong> {selected.event_type}</p>
            <p><strong>Date:</strong> {selected.event_date ? new Date(selected.event_date).toLocaleDateString() : "-"}</p>
            <p><strong>Venue:</strong> {selected.venue_type || "-"}</p>
            <p><strong>Customer:</strong> {selected.customer_id?.full_name || "Customer"}</p>
            <p><strong>Guests:</strong> {selected.guest_count || "-"}</p>
            <p><strong>Status:</strong> {selected.status}</p>
            <div className="actions">
              <button className="btn-outline" type="button" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}