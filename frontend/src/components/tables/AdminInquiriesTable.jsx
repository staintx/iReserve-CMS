const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

const statusClass = (status) => {
  if (!status || status === "new") return "pending";
  if (status === "under review" || status === "negotiating") return "info";
  if (status === "awaiting confirmation") return "warning";
  if (status === "confirmed") return "approved";
  if (["declined", "abandoned", "expired", "spam", "cancelled"].includes(status)) return "rejected";
  return "pending";
};

const statusLabel = (status) => {
  if (!status || status === "new") return "New";
  if (status === "under review") return "Under Review";
  if (status === "awaiting confirmation") return "Awaiting Confirmation";
  if (status === "negotiating") return "Negotiating";
  if (status === "confirmed") return "Confirmed";
  if (status === "declined") return "Declined";
  if (status === "abandoned") return "Abandoned";
  if (status === "expired") return "Expired";
  if (status === "spam") return "Spam";
  if (status === "cancelled") return "Cancelled";
  return status;
};

export default function AdminInquiriesTable({ inquiries, onReview }) {
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
                <button className="action-chip review-chip" type="button" onClick={() => onReview(inq)}>Review</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
