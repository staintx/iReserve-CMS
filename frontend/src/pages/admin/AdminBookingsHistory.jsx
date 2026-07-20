import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminBookingsHistoryTable from "../../components/tables/AdminBookingsHistoryTable";

export default function AdminBookingsHistory() {
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      AdminAPI.getBookings(),
      AdminAPI.getPayments()
    ])
      .then(([bRes, pRes]) => {
        setBookings(bRes.data.filter((b) => ["completed", "cancelled"].includes(b.status)));
        setPayments(pRes.data);
      })
      .catch(() => {
        setBookings([]);
        setPayments([]);
      });
  }, []);

  const enrichedBookings = bookings.map((b) => {
    const totalPaid = payments
      .filter((p) => String(p.booking_id?._id || p.booking_id) === String(b._id) && p.status === "approved")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const balanceDue = Math.max(0, (Number(b.total_price) || 0) - totalPaid);
    return { ...b, totalPaid, balanceDue };
  });

  const filtered = enrichedBookings.filter((booking) => {
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