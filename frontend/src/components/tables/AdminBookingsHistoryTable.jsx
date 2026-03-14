export default function AdminBookingsHistoryTable({ bookings }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Event</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((b) => (
          <tr key={b._id}>
            <td>{b._id}</td>
            <td>{b.event_type}</td>
            <td>{b.customer_id?.full_name || "Customer"}</td>
            <td>{new Date(b.event_date).toLocaleDateString()}</td>
            <td>{b.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
