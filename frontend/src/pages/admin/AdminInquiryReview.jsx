import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import useToast from "../../hooks/useToast";

export default function AdminInquiryReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [inquiry, setInquiry] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
        <p>Loading inquiry…</p>
      </AdminLayout>
    );
  }

  const isAlreadyReviewed = inquiry.status !== "pending";

  return (
    <AdminLayout>
      <div className="admin-quote-page">
        {/* Header */}
        <div className="quote-header">
          <button className="btn-ghost" type="button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="quote-title">
            <h1>Review Inquiry — {clientName} {inquiryCode}</h1>
            <p>Review all details below before taking action on this inquiry</p>
          </div>
        </div>

        {/* Review banner */}
        {!isAlreadyReviewed && (
          <div className="review-banner">
            <span className="review-banner-icon">📋</span>
            <div>
              <strong>This inquiry has not been reviewed yet.</strong>
              <p>Please review all the details below, then click "Mark as Reviewed" to proceed.</p>
            </div>
          </div>
        )}
        {isAlreadyReviewed && (
          <div className="review-banner review-banner-done">
            <span className="review-banner-icon">✅</span>
            <div>
              <strong>This inquiry has already been reviewed.</strong>
              <p>Status: {inquiry.status}{inquiry.reviewed_at ? ` · Reviewed on ${formatDate(inquiry.reviewed_at)}` : ""}</p>
            </div>
          </div>
        )}

        {/* Content card */}
        <div className="quote-card" style={{ marginTop: 18 }}>
          {/* Inquiry Summary */}
          <div className="quote-section">
            <h3>Inquiry Summary</h3>
            <div className="quote-info-grid">
              <div className="info-line">
                <span className="info-label">Inquiry ID:</span>
                <span>{inquiry._id?.slice(-6) || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Status:</span>
                <span className={`status-pill ${inquiry.status === "pending" ? "pending" : inquiry.status === "reviewed" ? "info" : "approved"}`}>
                  {inquiry.status || "pending"}
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

          {/* Contact Information */}
          <div className="quote-section">
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

          {/* Event Details */}
          <div className="quote-section">
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
          <div className="quote-section">
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

          {/* Budget Range */}
          <div className="quote-section">
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
          <div className="quote-section">
            <h3>Menu Selection</h3>
            {Array.isArray(inquiry.selected_menu) && inquiry.selected_menu.length > 0 ? (
              <div className="review-tag-list">
                {inquiry.selected_menu.map((item) => (
                  <span key={item} className="review-tag">{item}</span>
                ))}
              </div>
            ) : (
              <p className="dash-empty">No menu selections.</p>
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
          <div className="quote-section">
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
          <div className="quote-section">
            <h3>Additional Services</h3>
            {Array.isArray(inquiry.additional_services) && inquiry.additional_services.length > 0 ? (
              <div className="review-tag-list">
                {inquiry.additional_services.map((item) => (
                  <span key={item} className="review-tag">{item}</span>
                ))}
              </div>
            ) : (
              <p className="dash-empty">No additional services.</p>
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
          <div className="quote-section">
            <h3>Special Requests</h3>
            <p>{inquiry.special_requests || "N/A"}</p>
          </div>
        </div>

        {/* Action bar */}
        <div className="review-action-bar">
          <button className="btn-outline" type="button" onClick={() => navigate(-1)}>
            ← Back to Inquiries
          </button>
          {!isAlreadyReviewed && (
            <button
              className="btn review-btn"
              type="button"
              onClick={handleMarkReviewed}
              disabled={submitting}
            >
              {submitting ? "Marking…" : "✓ Mark as Reviewed"}
            </button>
          )}
          {isAlreadyReviewed && inquiry.status === "reviewed" && (
            <button
              className="btn"
              type="button"
              onClick={() => navigate(`/admin/inquiries/${inquiry._id}/quote`)}
            >
              Proceed to Quote →
            </button>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
