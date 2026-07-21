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
        <div className="ir-review-loading">
          <div className="ir-loading-spinner" />
          <p>Loading inquiry details...</p>
        </div>
      </AdminLayout>
    );
  }

  const isAlreadyReviewed = ["under review", "awaiting confirmation", "negotiating", "confirmed", "declined"].includes(
    inquiry.status
  );

  const statusClass = inquiry.status === "new"
    ? "pending"
    : inquiry.status === "under review"
      ? "info"
      : inquiry.status === "declined"
        ? "rejected"
        : "approved";

  return (
    <AdminLayout>
      <div className="ir-review-page">
        {/* ── Top Navigation ── */}
        <div className="ir-review-topbar">
          <button className="ir-back-btn" type="button" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <span className="ir-breadcrumb">Inquiries / <strong>Review</strong></span>
        </div>

        {/* ── Header Card ── */}
        <div className="ir-review-header-card">
          <div className="ir-review-header-top">
            <div className="ir-review-header-info">
              <div className="ir-review-header-avatar">
                {clientName.charAt(0).toUpperCase()}
              </div>
              <div className="ir-review-header-text">
                <h1 className="ir-review-title">{clientName}</h1>
                <div className="ir-review-meta">
                  <span className="ir-review-code">{inquiryCode}</span>
                  <span className="ir-review-meta-sep">·</span>
                  <span className={`status-pill ${statusClass}`}>{inquiry.status || "new"}</span>
                  <span className="ir-review-meta-sep">·</span>
                  <span className="ir-review-date">Submitted {formatDate(inquiry.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="ir-review-actions">
              {["new", "under review", "awaiting confirmation", "negotiating"].includes(inquiry.status) && (
                <button
                  className="ir-action-btn ir-action-decline"
                  type="button"
                  onClick={() => setRejectTarget(true)}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Decline
                </button>
              )}
              {!isAlreadyReviewed && (
                <button
                  className="ir-action-btn ir-action-review"
                  type="button"
                  onClick={handleMarkReviewed}
                  disabled={submitting}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {submitting ? "Marking…" : "Begin Review"}
                </button>
              )}
              {inquiry.status === "under review" && (
                <button
                  className="ir-action-btn ir-action-primary"
                  type="button"
                  onClick={() => navigate(`/admin/inquiries/${inquiry._id}/quote`)}
                >
                  Proceed to Quote
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7h7M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
              {["awaiting confirmation", "negotiating"].includes(inquiry.status) && (
                <button
                  className="ir-action-btn ir-action-primary"
                  type="button"
                  onClick={() => navigate(`/admin/inquiries/${inquiry._id}/quote`)}
                >
                  {inquiry.status === "awaiting confirmation" ? "View Quote" : "Edit Quote"}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7h7M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
              {inquiry.status === "confirmed" && (
                <button
                  className="ir-action-btn ir-action-success"
                  type="button"
                  onClick={() => navigate(`/admin/inquiries/${inquiry._id}/quote`)}
                >
                  Create Booking
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7h7M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              )}
            </div>
          </div>

          {/* ── Status Banners ── */}
          {!isAlreadyReviewed && (
            <div className="ir-review-banner ir-banner-warning">
              <span className="ir-banner-icon">📋</span>
              <div>
                <strong>This inquiry has not been reviewed yet.</strong>
                <p>Please review all the details below, then click "Begin Review" to proceed.</p>
              </div>
            </div>
          )}
          {isAlreadyReviewed && inquiry.status !== "declined" && (
            <div className="ir-review-banner ir-banner-success">
              <span className="ir-banner-icon">✅</span>
              <div>
                <strong>This inquiry has been reviewed.</strong>
                <p>Status: {inquiry.status}{inquiry.reviewed_at ? ` · Reviewed on ${formatDate(inquiry.reviewed_at)}` : ""}</p>
              </div>
            </div>
          )}
          {inquiry.status === "declined" && (
            <div className="ir-review-banner ir-banner-danger">
              <span className="ir-banner-icon">❌</span>
              <div>
                <strong>This inquiry was declined.</strong>
                <p>No further actions can be taken.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Content Grid ── */}
        <div className="ir-review-grid">
          {/* LEFT COLUMN */}
          <div className="ir-review-col">
            {/* Inquiry Summary */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="blue">📄</span>
                <h3>Inquiry Summary</h3>
              </div>
              <div className="ir-detail-grid">
                <DetailRow label="Inquiry ID" value={inquiry._id?.slice(-6) || "-"} />
                <DetailRow label="Status">
                  <span className={`status-pill ${statusClass}`}>{inquiry.status || "new"}</span>
                </DetailRow>
                <DetailRow label="Service Type" value={inquiry.service_type || (inquiry.include_food ? "Food & Event" : "Event Setup")} />
                <DetailRow label="Submitted" value={formatDate(inquiry.createdAt)} />
                <DetailRow label="Selected Package" value={inquiry.package_id?.name || "Custom"} />
                <DetailRow label="Payment Method" value={inquiry.payment_method || "-"} />
              </div>
            </div>

            {/* Event Details */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="purple">🎉</span>
                <h3>Event Details</h3>
              </div>
              <div className="ir-detail-grid">
                <DetailRow label="Event Type" value={inquiry.event_type || "-"} />
                <DetailRow label="Event Theme" value={inquiry.event_theme || "-"} />
                <DetailRow label="Event Date" value={formatDate(inquiry.event_date)} />
                <DetailRow label="Start Time" value={inquiry.start_time || "-"} />
                <DetailRow label="Guest Count" value={inquiry.guest_count || "-"} />
                <DetailRow label="Duration (hrs)" value={inquiry.duration_hours || "-"} />
              </div>
            </div>

            {/* Venue Information */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="green">📍</span>
                <h3>Venue Information</h3>
              </div>
              <div className="ir-detail-grid">
                <DetailRow label="Venue Type" value={inquiry.venue_type || "-"} />
                <DetailRow label="Indoor/Outdoor" value={inquiry.indoor_outdoor || "-"} />
                <DetailRow label="Province" value={inquiry.province || "-"} />
                <DetailRow label="Municipality" value={inquiry.municipality || "-"} />
                <DetailRow label="Barangay" value={inquiry.barangay || "-"} />
                <DetailRow label="Street" value={inquiry.street || "-"} />
                <DetailRow label="Landmark" value={inquiry.landmark || "-"} />
                <DetailRow label="Zip Code" value={inquiry.zip_code || "-"} />
              </div>

              {(inquiry.venue_contact_name || inquiry.venue_contact_phone) && (
                <>
                  <div className="ir-sub-heading">Venue Contact Person</div>
                  <div className="ir-detail-grid">
                    <DetailRow label="Name" value={inquiry.venue_contact_name || "-"} />
                    <DetailRow label="Contact Number" value={inquiry.venue_contact_phone || "-"} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="ir-review-col">
            {/* Contact Information */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="teal">👤</span>
                <h3>Contact Information</h3>
              </div>
              <div className="ir-detail-grid">
                <DetailRow label="First Name" value={inquiry.contact_first_name || "-"} />
                <DetailRow label="Last Name" value={inquiry.contact_last_name || "-"} />
                <DetailRow label="Email" value={inquiry.contact_email || inquiry.customer_id?.email || "-"} />
                <DetailRow label="Phone" value={inquiry.contact_phone || "-"} />
                <DetailRow label="Alt. Phone" value={inquiry.contact_alt_phone || "N/A"} />
                <DetailRow label="Preferred Contact" value={inquiry.contact_method || "-"} />
              </div>
            </div>

            {/* Budget */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="gold">💰</span>
                <h3>Budget Information</h3>
              </div>
              <div className="ir-detail-grid">
                <DetailRow label="Budget Min" value={inquiry.budget_min ? `PHP ${Number(inquiry.budget_min).toLocaleString()}` : "-"} />
                <DetailRow label="Budget Max" value={inquiry.budget_max ? `PHP ${Number(inquiry.budget_max).toLocaleString()}` : "-"} />
              </div>
            </div>

            {/* Menu Selection */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="orange">🍽️</span>
                <h3>Menu Selection</h3>
              </div>
              {Array.isArray(inquiry.selected_menu) && inquiry.selected_menu.length > 0 ? (
                <div className="ir-tag-list">
                  {inquiry.selected_menu.map((item) => (
                    <span key={item} className="ir-tag">{item}</span>
                  ))}
                </div>
              ) : (
                <p className="ir-empty-text">No menu selections.</p>
              )}
              {Array.isArray(inquiry.menu_items) && inquiry.menu_items.length > 0 && (
                <>
                  <div className="ir-sub-heading">Menu Items Detail</div>
                  <div className="ir-detail-grid">
                    {inquiry.menu_items.map((item, idx) => (
                      <DetailRow key={`mi-${idx}`} label={item.name}>
                        {item.note || "-"}{item.price ? ` · PHP ${Number(item.price).toLocaleString()}` : ""}
                      </DetailRow>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Dietary Restrictions */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="red">🥗</span>
                <h3>Dietary Restrictions & Allergies</h3>
              </div>
              <div className="ir-detail-grid">
                <DetailRow label="Dietary Restrictions" value={inquiry.dietary_restrictions || "None"} />
                <DetailRow label="Allergies" value={inquiry.allergies || "None"} />
              </div>
            </div>

            {/* Additional Services */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="indigo">⚙️</span>
                <h3>Additional Services</h3>
              </div>
              {Array.isArray(inquiry.additional_services) && inquiry.additional_services.length > 0 ? (
                <div className="ir-tag-list">
                  {inquiry.additional_services.map((item) => (
                    <span key={item} className="ir-tag">{item}</span>
                  ))}
                </div>
              ) : (
                <p className="ir-empty-text">No additional services.</p>
              )}
              {Array.isArray(inquiry.service_items) && inquiry.service_items.length > 0 && (
                <>
                  <div className="ir-sub-heading">Service Items Detail</div>
                  <div className="ir-detail-grid">
                    {inquiry.service_items.map((item, idx) => (
                      <DetailRow key={`si-${idx}`} label={item.name}>
                        Qty {item.quantity || 0}{item.price ? ` · PHP ${Number(item.price).toLocaleString()}` : ""}
                      </DetailRow>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Special Requests */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="pink">📝</span>
                <h3>Special Requests</h3>
              </div>
              <p className="ir-special-requests">{inquiry.special_requests || "N/A"}</p>
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

/* ── Reusable detail row component ── */
function DetailRow({ label, value, children }) {
  return (
    <div className="ir-detail-row">
      <span className="ir-detail-label">{label}</span>
      <span className="ir-detail-value">{children ?? value}</span>
    </div>
  );
}
