const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

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

export default function AdminBookingsActiveTable({ bookings, onMarkDone, onCancel, onView }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Guests</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((b) => (
          <tr key={b._id}>
            <td>{b.event_type}</td>
            <td>{b.customer_id?.full_name || "Customer"}</td>
            <td>{formatDate(b.event_date)}</td>
            <td>{b.guest_count}</td>
            <td>
              <span className={`status-pill ${STATUS_CLASS[b.status] || "pending"}`}>
                {STATUS_LABELS[b.status] || b.status}
              </span>
            </td>
            <td>
              <button className="btn-outline" onClick={() => onView?.(b)}>View</button>
              <button className="btn" onClick={() => onMarkDone?.(b)}>Mark Done</button>
              <button className="btn-danger" onClick={() => onCancel?.(b)}>Cancel</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
