const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

const formatId = (value) => (value ? `EVT-${String(value).slice(-6).toUpperCase()}` : "-");

const STATUS_LABELS = {
  "pending deposit": "Pending Deposit",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled"
};

const STATUS_CLASS = {
  "pending deposit": "warning",
  confirmed: "approved",
  preparing: "info",
  ongoing: "ongoing",
  completed: "approved",
  cancelled: "rejected"
};

export default function AdminBookingsHistoryTable({ bookings, onView }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Event</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((b) => (
          <tr key={b._id}>
            <td>{formatId(b._id)}</td>
            <td>{b.event_type}</td>
            <td>{b.customer_id?.full_name || "Customer"}</td>
            <td>{formatDate(b.event_date)}</td>
            <td>
              <span className={`status-pill ${STATUS_CLASS[b.status] || "pending"}`}>
                {STATUS_LABELS[b.status] || b.status}
              </span>
            </td>
            <td>
              <button className="btn-outline" onClick={() => onView?.(b)}>View</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
