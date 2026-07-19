import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import useToast from "../../hooks/useToast";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function AdminInquiryReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [inquiry, setInquiry] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(false);

  useEffect(() => {
    AdminAPI.getInquiry(id)
      .then((res) => setInquiry(res.data))
      .catch(() => notify("Could not load inquiry. Please try again.", "error"));
  }, [id, notify]);

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString() : "-";

  const inquiryCode = useMemo(() => {
    if (!inquiry?._id) return "INQ-000";
    const tail = inquiry._id.slice(-3).toUpperCase();
    return `INQ-${tail}`;
  }, [inquiry]);

  const clientName = useMemo(() => {
    if (!inquiry) return "Client";
    if (inquiry.contact_first_name)
      return `${inquiry.contact_first_name} ${inquiry.contact_last_name || ""}`.trim();
    return inquiry.customer_id?.full_name || "Client";
  }, [inquiry]);

  const handleMarkReviewed = () => {
    if (!inquiry) return;
    setSubmitting(true);
    AdminAPI.reviewInquiry(inquiry._id)
      .then(() => {
        notify("Inquiry marked as reviewed.", "success");
        navigate("/admin/inquiries");
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Could not mark as reviewed.", "error");
        setSubmitting(false);
      });
  };

  if (!inquiry) {
    return (
      <AdminLayout>
        <div className="p-6">Loading inquiry details...</div>
      </AdminLayout>
    );
  }

  const isAlreadyReviewed = ["under review", "awaiting confirmation", "negotiating", "confirmed", "declined"].includes(
    inquiry.status
  );

  return (
    <AdminLayout>
      <div className="admin-quote-page" style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "40px" }}>
        {/* Header & Actions */}
        <div className="quote-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <button className="btn-ghost" type="button" onClick={() => navigate(-1)} style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>
              ← Back
            </button>
            <div className="quote-title">
              <h1>Review Inquiry — {clientName} {inquiryCode}</h1>
              <p>Review all details below before taking action on this inquiry</p>
            </div>
          </div>
          
          <div className="review-action-bar" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            {["new", "under review", "awaiting confirmation", "negotiating"].includes(inquiry.status) && (
              <button
                className="btn-outline danger"
                type="button"
                onClick={() => setRejectTarget(true)}
                style={{ borderColor: "#ef4444", color: "#ef4444", padding: "8px 16px" }}
              >
                Decline Inquiry
              </button>
            )}
            {!isAlreadyReviewed && (
              <button
                className="btn review-btn"
                type="button"
                onClick={handleMarkReviewed}
                disabled={submitting}
                style={{ padding: "8px 16px" }}
              >
                {submitting ? "Marking…" : "✓ Begin Review"}
              </button>
            )}
            {inquiry.status === "under review" && (
              <button
                className="btn"
                type="button"
                onClick={() => navigate(`/admin/inquiries/${inquiry._id}/quote`)}
                style={{ padding: "8px 16px" }}
              >
                Proceed to Quote →
              </button>
            )}
            {["awaiting confirmation", "negotiating"].includes(inquiry.status) && (
              <button
                className="btn"
                type="button"
                onClick={() => navigate(`/admin/inquiries/${inquiry._id}/quote`)}
                style={{ padding: "8px 16px" }}
              >
                Edit Quote →
              </button>
            )}
            {inquiry.status === "confirmed" && (
              <button
                className="btn success"
                type="button"
                style={{ backgroundColor: "#10b981", borderColor: "#10b981", color: "#fff", padding: "8px 16px" }}
                onClick={() => navigate(`/admin/inquiries/${inquiry._id}/quote`)}
              >
                Create Booking →
              </button>
            )}
          </div>
        </div>

        {/* Review banner */}
        {!isAlreadyReviewed && (
          <div className="review-banner" style={{ background: "#fef3c7", padding: "16px", borderRadius: "12px", display: "flex", gap: "12px", alignItems: "center", marginBottom: "18px", border: "1px solid #fde68a" }}>
            <span className="review-banner-icon" style={{ fontSize: "24px" }}>📋</span>
            <div>
              <strong style={{ color: "#92400e" }}>This inquiry has not been reviewed yet.</strong>
              <p style={{ margin: "4px 0 0", color: "#b45309", fontSize: "13px" }}>Please review all the details below, then click "Begin Review" to proceed.</p>
            </div>
          </div>
        )}
        {isAlreadyReviewed && inquiry.status !== "declined" && (
          <div className="review-banner review-banner-done" style={{ background: "#f0fdf4", padding: "16px", borderRadius: "12px", display: "flex", gap: "12px", alignItems: "center", marginBottom: "18px", border: "1px solid #bbf7d0" }}>
            <span className="review-banner-icon" style={{ fontSize: "24px" }}>✅</span>
            <div>
              <strong style={{ color: "#166534" }}>This inquiry has already been reviewed.</strong>
              <p style={{ margin: "4px 0 0", color: "#15803d", fontSize: "13px" }}>Status: {inquiry.status}{inquiry.reviewed_at ? ` · Reviewed on ${formatDate(inquiry.reviewed_at)}` : ""}</p>
            </div>
          </div>
        )}
        {inquiry.status === "declined" && (
          <div className="review-banner" style={{ background: "#fef2f2", padding: "16px", borderRadius: "12px", display: "flex", gap: "12px", alignItems: "center", marginBottom: "18px", border: "1px solid #fecaca" }}>
            <span className="review-banner-icon" style={{ fontSize: "24px" }}>❌</span>
            <div>
              <strong style={{ color: "#b91c1c" }}>This inquiry was declined.</strong>
              <p style={{ margin: "4px 0 0", color: "#dc2626", fontSize: "13px" }}>No further actions can be taken.</p>
            </div>
          </div>
        )}

        {/* Content card */}
        <div className="quote-card" style={{ width: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "40px" }}>
            
            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Inquiry Summary */}
              <div className="quote-section" style={{ paddingTop: 0, paddingBottom: "24px", borderBottom: "1px solid #e5e7eb" }}>
                <h3>Inquiry Summary</h3>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">Inquiry ID:</span>
                    <span>{inquiry._id?.slice(-6) || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Status:</span>
                    <span className={`status-pill ${inquiry.status === "new" ? "pending" : inquiry.status === "under review" ? "info" : inquiry.status === "declined" ? "rejected" : "approved"}`}>
                      {inquiry.status || "new"}
                    </span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Service Type:</span>
                    <span>{inquiry.service_type || (inquiry.include_food ? "Food & Event" : "Event Setup")}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Submitted:</span>
                    <span>{formatDate(inquiry.createdAt)}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Selected Package:</span>
                    <span>{inquiry.package_id?.name || "Custom"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Payment Method:</span>
                    <span>{inquiry.payment_method || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="quote-section" style={{ paddingBottom: "24px", borderBottom: "1px solid #e5e7eb" }}>
                <h3>Event Details</h3>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">Event Type:</span>
                    <span>{inquiry.event_type || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Event Theme:</span>
                    <span>{inquiry.event_theme || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Event Date:</span>
                    <span>{formatDate(inquiry.event_date)}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Start Time:</span>
                    <span>{inquiry.start_time || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Guest Count:</span>
                    <span>{inquiry.guest_count || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Duration (hours):</span>
                    <span>{inquiry.duration_hours || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Venue Information */}
              <div className="quote-section" style={{ borderBottom: "none" }}>
                <h3>Venue Information</h3>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">Venue Type:</span>
                    <span>{inquiry.venue_type || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Indoor/Outdoor:</span>
                    <span>{inquiry.indoor_outdoor || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Province:</span>
                    <span>{inquiry.province || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Municipality:</span>
                    <span>{inquiry.municipality || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Barangay:</span>
                    <span>{inquiry.barangay || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Street:</span>
                    <span>{inquiry.street || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Landmark:</span>
                    <span>{inquiry.landmark || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Zip Code:</span>
                    <span>{inquiry.zip_code || "-"}</span>
                  </div>
                </div>

                <div className="quote-subtitle">Venue Contact Person</div>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">Name:</span>
                    <span>{inquiry.venue_contact_name || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Contact Number:</span>
                    <span>{inquiry.venue_contact_phone || "-"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Contact Information */}
              <div className="quote-section" style={{ paddingTop: 0, paddingBottom: "24px", borderBottom: "1px solid #e5e7eb" }}>
                <h3>Contact Information</h3>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">First Name:</span>
                    <span>{inquiry.contact_first_name || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Last Name:</span>
                    <span>{inquiry.contact_last_name || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Email Address:</span>
                    <span>{inquiry.contact_email || inquiry.customer_id?.email || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Phone Number:</span>
                    <span>{inquiry.contact_phone || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Alt. Phone:</span>
                    <span>{inquiry.contact_alt_phone || "N/A"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Preferred Contact:</span>
                    <span>{inquiry.contact_method || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Budget Range */}
              <div className="quote-section" style={{ paddingBottom: "24px", borderBottom: "1px solid #e5e7eb" }}>
                <h3>Budget Information</h3>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">Budget Min:</span>
                    <span>{inquiry.budget_min ? `PHP ${Number(inquiry.budget_min).toLocaleString()}` : "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Budget Max:</span>
                    <span>{inquiry.budget_max ? `PHP ${Number(inquiry.budget_max).toLocaleString()}` : "-"}</span>
                  </div>
                </div>
              </div>

              {/* Menu Selection */}
              <div className="quote-section" style={{ paddingBottom: "24px", borderBottom: "1px solid #e5e7eb" }}>
                <h3>Menu Selection</h3>
                {Array.isArray(inquiry.selected_menu) && inquiry.selected_menu.length > 0 ? (
                  <div className="review-tag-list" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                    {inquiry.selected_menu.map((item) => (
                      <span key={item} className="review-tag" style={{ background: "#f3f4f6", padding: "4px 10px", borderRadius: "16px", fontSize: "12px", border: "1px solid #e5e7eb" }}>{item}</span>
                    ))}
                  </div>
                ) : (
                  <p className="dash-empty" style={{ color: "#6b7280", fontSize: "13px" }}>No menu selections.</p>
                )}
                {Array.isArray(inquiry.menu_items) && inquiry.menu_items.length > 0 && (
                  <>
                    <div className="quote-subtitle">Menu Items Detail</div>
                    <div className="quote-info-grid">
                      {inquiry.menu_items.map((item, idx) => (
                        <div className="info-line" key={`mi-${idx}`}>
                          <span className="info-label">{item.name}:</span>
                          <span>{item.note || "-"}{item.price ? ` · PHP ${Number(item.price).toLocaleString()}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Dietary Info */}
              <div className="quote-section" style={{ paddingBottom: "24px", borderBottom: "1px solid #e5e7eb" }}>
                <h3>Dietary Restrictions & Allergies</h3>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">Dietary Restrictions:</span>
                    <span>{inquiry.dietary_restrictions || "None"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Allergies:</span>
                    <span>{inquiry.allergies || "None"}</span>
                  </div>
                </div>
              </div>

              {/* Additional Services */}
              <div className="quote-section" style={{ paddingBottom: "24px", borderBottom: "1px solid #e5e7eb" }}>
                <h3>Additional Services</h3>
                {Array.isArray(inquiry.additional_services) && inquiry.additional_services.length > 0 ? (
                  <div className="review-tag-list" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                    {inquiry.additional_services.map((item) => (
                      <span key={item} className="review-tag" style={{ background: "#f3f4f6", padding: "4px 10px", borderRadius: "16px", fontSize: "12px", border: "1px solid #e5e7eb" }}>{item}</span>
                    ))}
                  </div>
                ) : (
                  <p className="dash-empty" style={{ color: "#6b7280", fontSize: "13px" }}>No additional services.</p>
                )}
                {Array.isArray(inquiry.service_items) && inquiry.service_items.length > 0 && (
                  <>
                    <div className="quote-subtitle">Service Items Detail</div>
                    <div className="quote-info-grid">
                      {inquiry.service_items.map((item, idx) => (
                        <div className="info-line" key={`si-${idx}`}>
                          <span className="info-label">{item.name}:</span>
                          <span>Qty {item.quantity || 0}{item.price ? ` · PHP ${Number(item.price).toLocaleString()}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Special Requests */}
              <div className="quote-section" style={{ borderBottom: "none" }}>
                <h3>Special Requests</h3>
                <p style={{ background: "#f9fafb", padding: "12px", borderRadius: "8px", border: "1px solid #f3f4f6", fontSize: "13px" }}>{inquiry.special_requests || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {rejectTarget && (
        <ConfirmDialog
          message={`Decline inquiry ${inquiryCode}? This cannot be undone.`}
          onConfirm={() => {
            setSubmitting(true);
            AdminAPI.updateInquiry(inquiry._id, { status: "declined" })
              .then(() => {
                notify("Inquiry declined.", "success");
                navigate("/admin/inquiries");
              })
              .catch((err) => {
                notify(err.response?.data?.message || "Could not decline inquiry.", "error");
                setSubmitting(false);
                setRejectTarget(false);
              });
          }}
          onCancel={() => setRejectTarget(false)}
        />
      )}
    </AdminLayout>
  );
}
