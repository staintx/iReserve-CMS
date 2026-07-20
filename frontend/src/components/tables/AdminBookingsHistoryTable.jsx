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
          <th>Payment</th>
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
              <div className="text-xs">
                <div>Total: ₱{(Number(b.total_price) || 0).toLocaleString()}</div>
                <div className="text-emerald-600">Paid: ₱{(Number(b.totalPaid) || 0).toLocaleString()}</div>
                <div className={b.balanceDue > 0 ? "text-red-600" : "text-emerald-600"}>Bal: ₱{(Number(b.balanceDue) || 0).toLocaleString()}</div>
              </div>
            </td>
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
