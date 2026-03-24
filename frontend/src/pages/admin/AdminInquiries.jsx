import { useEffect, useState } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminInquiriesTable from "../../components/tables/AdminInquiriesTable";
import useToast from "../../hooks/useToast";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Modal from "../../components/common/Modal";

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { notify } = useToast();
  const navigate = useNavigate();

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

  const load = () =>
    AdminAPI.getInquiries().then((res) => {
      setInquiries(res.data);
      if (res.data.length > 0) setSelected(res.data[0]);
    });

  useEffect(() => {
    load();
    AdminAPI.getPackages().then(() => {});
    AdminAPI.getStaff().then(() => {});
  }, []);

  const updateStatus = (id, status) => {
    if (!id) {
      notify("Missing inquiry ID. Please refresh and try again.", "error");
      return;
    }
    AdminAPI.updateInquiry(id, { status })
      .then(() => {
        notify(`Inquiry ${status}.`, "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not update the inquiry. Please try again.", "error"));
  };

  const filtered = inquiries.filter((inq) => {
    const text = `${inq.event_type || ""} ${inq.customer_id?.full_name || ""} ${inq.contact_first_name || ""} ${inq.contact_last_name || ""}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || inq.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const summaryText = useMemo(() => {
    if (filtered.length === 0) return "Showing 0 inquiries";
    return `Showing 1-${filtered.length} of ${filtered.length} inquiries`;
  }, [filtered.length]);

  const openQuotePage = (inq) => {
    navigate(`/admin/inquiries/${inq._id}/quote`);
  };

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Inquiry Management</h1>
          <p>Review and quote customer inquiries</p>
        </div>
      </div>
      <div className="admin-actions" style={{ marginBottom: "12px" }}>
        <div className="admin-search">
          <span className="search-icon">🔍</span>
          <input placeholder="Search by client name, booking ID, or event type.." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="admin-filter">Filters</button>
        <select className="admin-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="quoted">Awaiting Payment</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="admin-table-wrap">
        <AdminInquiriesTable
          inquiries={filtered}
          onSelect={(inq) => {
            setSelected(inq);
            setViewTarget(inq);
          }}
          onQuote={openQuotePage}
          onReject={(inq) => setRejectTarget(inq)}
        />
        {rejectTarget && (
          <ConfirmDialog
            message={`Reject inquiry ${rejectTarget._id?.slice(-6) || ""}? This cannot be undone.`}
            onConfirm={() => {
              updateStatus(rejectTarget._id, "rejected");
              setRejectTarget(null);
            }}
            onCancel={() => setRejectTarget(null)}
          />
        )}
        {viewTarget && (
          <Modal title="Inquiry Details" onClose={() => setViewTarget(null)} className="modal-wide">
            <div className="quote-card">
              <div className="quote-section">
                <h3>Inquiry Summary</h3>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">Inquiry ID:</span>
                    <span>{viewTarget._id?.slice(-6) || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Status:</span>
                    <span>{viewTarget.status || "pending"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Service Type:</span>
                    <span>{viewTarget.service_type || (viewTarget.include_food ? "Food & Event" : "Event Setup")}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Submitted:</span>
                    <span>{formatDate(viewTarget.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="quote-section">
                <h3>Contact Information</h3>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">First Name:</span>
                    <span>{viewTarget.contact_first_name || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Last Name:</span>
                    <span>{viewTarget.contact_last_name || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Email Address:</span>
                    <span>{viewTarget.contact_email || viewTarget.customer_id?.email || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Phone Number:</span>
                    <span>{viewTarget.contact_phone || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Preferred Contact:</span>
                    <span>{viewTarget.contact_method || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="quote-section">
                <h3>Event Details</h3>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">Event Type:</span>
                    <span>{viewTarget.event_type || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Event Theme:</span>
                    <span>{viewTarget.event_theme || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Event Date:</span>
                    <span>{formatDate(viewTarget.event_date)}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Start Time:</span>
                    <span>{viewTarget.start_time || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Guest Count:</span>
                    <span>{viewTarget.guest_count || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Duration (hours):</span>
                    <span>{viewTarget.duration_hours || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="quote-section">
                <h3>Venue Information</h3>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">Venue Type:</span>
                    <span>{viewTarget.venue_type || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Indoor/Outdoor:</span>
                    <span>{viewTarget.indoor_outdoor || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Province:</span>
                    <span>{viewTarget.province || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Municipality:</span>
                    <span>{viewTarget.municipality || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Barangay:</span>
                    <span>{viewTarget.barangay || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Street:</span>
                    <span>{viewTarget.street || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Landmark:</span>
                    <span>{viewTarget.landmark || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Zip Code:</span>
                    <span>{viewTarget.zip_code || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="quote-section">
                <h3>Menu Selection</h3>
                {Array.isArray(viewTarget.selected_menu) && viewTarget.selected_menu.length > 0 ? (
                  <div className="quote-grid">
                    {viewTarget.selected_menu.map((item) => (
                      <div key={item} className="summary-line">
                        <span>{item}</span>
                        <span>—</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dash-empty">No menu selections.</p>
                )}
              </div>

              <div className="quote-section">
                <h3>Additional Services</h3>
                {Array.isArray(viewTarget.additional_services) && viewTarget.additional_services.length > 0 ? (
                  <div className="quote-grid">
                    {viewTarget.additional_services.map((item) => (
                      <div key={item} className="summary-line">
                        <span>{item}</span>
                        <span>—</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dash-empty">No additional services.</p>
                )}
              </div>

              <div className="quote-section">
                <h3>Special Requests</h3>
                <p>{viewTarget.special_requests || "N/A"}</p>
              </div>
            </div>
          </Modal>
        )}
        <div className="table-footer">
          <span>{summaryText}</span>
          <div className="pager">
            <button type="button">&lt;</button>
            <button type="button" className="active">1</button>
            <button type="button">2</button>
            <button type="button">3</button>
            <button type="button">4</button>
            <button type="button">5</button>
            <button type="button">&gt;</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}