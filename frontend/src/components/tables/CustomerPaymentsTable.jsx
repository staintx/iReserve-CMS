export default function CustomerPaymentsTable({ payments, formatCurrency }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Date</th>
          <th>Type</th>
          <th>Method</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p._id}>
            <td>{p.booking_id?.event_type || "Event"}</td>
            <td>{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}</td>
            <td>{p.payment_type || "Payment"}</td>
            <td>{p.method || "-"}</td>
            <td>{formatCurrency(p.amount)}</td>
            <td>{p.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
