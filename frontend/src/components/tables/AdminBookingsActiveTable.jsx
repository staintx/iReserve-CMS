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
            <td>{new Date(b.event_date).toLocaleDateString()}</td>
            <td>{b.guest_count}</td>
            <td>{b.status}</td>
            <td>
              <button className="btn-outline" onClick={() => onView?.(b)}>View</button>
              <button className="btn" onClick={() => onMarkDone(b._id)}>Mark Done</button>
              <button className="btn-danger" onClick={() => onCancel(b._id)}>Cancel</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
