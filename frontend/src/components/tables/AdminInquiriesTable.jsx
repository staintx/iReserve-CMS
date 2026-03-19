const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

const statusClass = (status) => {
  if (!status) return "pending";
  if (status === "quoted") return "warning";
  if (["approved", "confirmed"].includes(status)) return "approved";
  if (["rejected", "cancelled"].includes(status)) return "rejected";
  return "pending";
};

const statusLabel = (status) => {
  if (!status) return "Pending";
  if (status === "quoted") return "Awaiting Payment";
  if (status === "approved") return "Payment Confirmed";
  if (status === "rejected") return "Rejected";
  if (status === "cancelled") return "Cancelled";
  return status;
};

export default function AdminInquiriesTable({ inquiries, onSelect, onQuote, onConvert, onApprove, onReject }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Inquiry ID</th>
          <th>Client Name</th>
          <th>Event Type</th>
          <th>Selected Package</th>
          <th>Event Date</th>
          <th>Request Type</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {inquiries.map((inq) => (
          <tr key={inq._id}>
            <td>{inq._id?.slice(-6) || "-"}</td>
            <td>{inq.contact_first_name ? `${inq.contact_first_name} ${inq.contact_last_name || ""}` : (inq.customer_id?.full_name || "Customer")}</td>
            <td>{inq.event_type || "-"}</td>
            <td>{inq.package_id?.name || "Custom"}</td>
            <td>{formatDate(inq.event_date)}</td>
            <td>{inq.service_type || (inq.include_food ? "Food & Event" : "Event Setup")}</td>
            <td>
              <span className={`status-pill ${statusClass(inq.status)}`}>
                {statusLabel(inq.status)}
              </span>
            </td>
            <td>
              <div className="table-actions">
                {inq.status === "pending" && (
                  <button className="action-chip" type="button" onClick={() => onQuote(inq)}>Make a Quote</button>
                )}
                {inq.status === "quoted" && (
                  <>
                    <button className="action-chip muted" type="button">Quoted</button>
                    <button className="action-chip" type="button" onClick={() => onQuote(inq)}>Edit</button>
                  </>
                )}
                {inq.status === "approved" && (
                  <>
                    <button className="action-chip success" type="button" onClick={() => onConvert(inq)}>Convert</button>
                    <button className="action-chip danger" type="button" onClick={() => onReject(inq)}>Reject</button>
                  </>
                )}
                {inq.status !== "approved" && (
                  <button className="action-chip success" type="button" onClick={() => onApprove(inq)}>Approve</button>
                )}
                {inq.status !== "approved" && (
                  <button className="action-chip danger" type="button" onClick={() => onReject(inq)}>Reject</button>
                )}
                <button className="action-link" type="button" onClick={() => onSelect(inq)}>View</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
