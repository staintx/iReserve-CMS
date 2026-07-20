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

export default function AdminBookingsCalendarTable({ items }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Guests</th>
          <th>Status</th>
          <th>Venue</th>
        </tr>
      </thead>
      <tbody>
        {items.map((booking) => (
          <tr key={booking._id}>
            <td>{booking.event_type}</td>
            <td>{booking.guest_count}</td>
            <td>
              <span className={`status-pill ${STATUS_CLASS[booking.status] || "pending"}`}>
                {STATUS_LABELS[booking.status] || booking.status}
              </span>
            </td>
            <td>{booking.venue_type || ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
