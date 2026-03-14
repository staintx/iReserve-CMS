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
            <td>{booking.status}</td>
            <td>{booking.venue_type || ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
