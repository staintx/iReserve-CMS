export default function AdminInquiriesTable({ inquiries, onSelect }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Date</th>
          <th>Guests</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {inquiries.map((inq) => (
          <tr key={inq._id} onClick={() => onSelect(inq)}>
            <td>{inq.event_type}</td>
            <td>{inq.event_date ? new Date(inq.event_date).toLocaleDateString() : ""}</td>
            <td>{inq.guest_count}</td>
            <td>{inq.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
