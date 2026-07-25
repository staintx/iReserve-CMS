const formatAmount = (value) => `PHP ${Number(value || 0).toLocaleString()}`;

const formatId = (value) => (value ? `TXN-${String(value).slice(-6).toUpperCase()}` : "-");

const statusLabel = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "Pending");

export default function AdminPaymentApprovalsTable({ payments, onApprove, onReject, onViewProof }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Transaction</th>
          <th>Client Name</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Payment Method</th>
          <th>Proof</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((p) => (
          <tr key={p._id}>
            <td>{formatId(p._id)}</td>
            <td>{p.customer_id?.full_name || "Customer"}</td>
            <td>{p.payment_type}</td>
            <td>{formatAmount(p.amount)}</td>
            <td>{p.method || "-"}</td>
            <td>
              {p.proof_url || p.checkout_url ? (
                <button className="action-link" type="button" onClick={() => onViewProof?.(p)}>
                  View
                </button>
              ) : (
                "-"
              )}
            </td>
            <td>
              <span className={`badge-status ${p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "pending"}`}>
                {statusLabel(p.status)}
              </span>
            </td>
            <td>
              {p.method === 'paymongo' && p.status === 'pending' ? (
                <span className="text-sm text-slate-500">Waiting for customer</span>
              ) : (
                "-"
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
