export default function AdminPaymentApprovalsTable({ payments, onApprove, onReject }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Transaction</th>
          <th>Client Name</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Payment Method</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p._id}>
            <td>{p.booking_id?._id || p._id}</td>
            <td>{p.customer_id?.full_name || "Customer"}</td>
            <td>{p.payment_type}</td>
            <td>₱{p.amount}</td>
            <td>{p.method}</td>
            <td>
              <span className={`badge-status ${p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "pending"}`}>
                {p.status}
              </span>
            </td>
            <td>
              {p._id?.startsWith("mock-") ? null : (
                <>
                  {p.status === "pending" && (
                    <>
                      <button className="btn" onClick={() => onApprove(p._id)}>Approve</button>
                      <button className="btn-danger" onClick={() => onReject(p._id)}>Reject</button>
                    </>
                  )}
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
