import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import useToast from "../../hooks/useToast";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function AdminBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [booking, setBooking] = useState(null);
  const [payments, setPayments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(false);

  useEffect(() => {
    AdminAPI.getBooking(id)
      .then((res) => setBooking(res.data))
      .catch(() => notify("Could not load booking details. Please try again.", "error"));

    AdminAPI.getPayments()
      .then((res) => {
        setPayments(res.data.filter((p) => String(p.booking_id?._id || p.booking_id) === id));
      })
      .catch(() => setPayments([]));
  }, [id, notify]);

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString() : "-";

  const formatDateTime = (value) =>
    value ? new Date(value).toLocaleString() : "-";

  const formatCurrency = (value) =>
    value != null ? `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "-";

  const bookingCode = useMemo(() => {
    if (!booking?._id) return "BKG-000";
    const tail = booking._id.slice(-6).toUpperCase();
    return `BKG-${tail}`;
  }, [booking]);

  const clientName = useMemo(() => {
    if (!booking) return "Client";
    if (booking.contact_first_name)
      return `${booking.contact_first_name} ${booking.contact_last_name || ""}`.trim();
    return booking.customer_id?.full_name || "Client";
  }, [booking]);

  const handleMarkComplete = () => {
    if (!booking) return;
    setSubmitting(true);
    AdminAPI.updateBooking(booking._id, { status: "completed" })
      .then(() => {
        notify("Booking marked as completed.", "success");
        navigate("/admin/bookings/active");
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Could not mark as completed.", "error");
        setSubmitting(false);
        setCompleteTarget(false);
      });
  };

  const handleCancel = () => {
    if (!booking) return;
    setSubmitting(true);
    AdminAPI.updateBooking(booking._id, { status: "cancelled" })
      .then(() => {
        notify("Booking cancelled.", "warning");
        navigate("/admin/bookings/active");
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Could not cancel booking.", "error");
        setSubmitting(false);
        setCancelTarget(false);
      });
  };

  if (!booking) {
    return (
      <AdminLayout>
        <div className="ir-review-loading">
          <div className="ir-loading-spinner" />
          <p>Loading booking details...</p>
        </div>
      </AdminLayout>
    );
  }

  const statusClass =
    booking.status === "active"
      ? "approved"
      : booking.status === "completed"
        ? "info"
        : booking.status === "cancelled"
          ? "rejected"
          : "pending";

  const paymentStatusClass =
    booking.payment_status === "approved" || booking.payment_status === "paid"
      ? "approved"
      : booking.payment_status === "rejected"
        ? "rejected"
        : "pending";

  const fullAddress = [
    booking.street,
    booking.barangay,
    booking.municipality,
    booking.province,
    booking.zip_code
  ].filter(Boolean).join(", ");

  const totalPaid = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalPrice = Number(booking.total_price) || 0;
  const balance = totalPrice - totalPaid;

  return (
    <AdminLayout>
      <div className="ir-review-page">
        {/* ── Top Navigation ── */}
        <div className="ir-review-topbar">
          <button className="ir-back-btn" type="button" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <span className="ir-breadcrumb">Bookings / <strong>Details</strong></span>
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
                  <span className="ir-review-code">{bookingCode}</span>
                  <span className="ir-review-meta-sep">·</span>
                  <span className={`status-pill ${statusClass}`}>{booking.status}</span>
                  <span className="ir-review-meta-sep">·</span>
                  <span className={`status-pill ${paymentStatusClass}`}>Payment: {booking.payment_status || "pending"}</span>
                  <span className="ir-review-meta-sep">·</span>
                  <span className="ir-review-date">Created {formatDate(booking.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="ir-review-actions">
              {booking.status === "active" && (
                <>
                  <button
                    className="ir-action-btn ir-action-decline"
                    type="button"
                    onClick={() => setCancelTarget(true)}
                    disabled={submitting}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    Cancel Booking
                  </button>
                  <button
                    className="ir-action-btn ir-action-success"
                    type="button"
                    onClick={() => setCompleteTarget(true)}
                    disabled={submitting}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Mark Completed
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Status Banners ── */}
          {booking.status === "active" && (
            <div className="ir-review-banner ir-banner-success">
              <span className="ir-banner-icon">📅</span>
              <div>
                <strong>Active Booking</strong>
                <p>Event is scheduled for {formatDate(booking.event_date)}. Review all details below.</p>
              </div>
            </div>
          )}
          {booking.status === "completed" && (
            <div className="ir-review-banner ir-banner-success">
              <span className="ir-banner-icon">✅</span>
              <div>
                <strong>Booking Completed</strong>
                <p>This event was completed{booking.completed_at ? ` on ${formatDate(booking.completed_at)}` : ""}.</p>
              </div>
            </div>
          )}
          {booking.status === "cancelled" && (
            <div className="ir-review-banner ir-banner-danger">
              <span className="ir-banner-icon">❌</span>
              <div>
                <strong>Booking Cancelled</strong>
                <p>This booking has been cancelled.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Content Grid ── */}
        <div className="ir-review-grid">
          {/* LEFT COLUMN */}
          <div className="ir-review-col">
            {/* Booking Summary */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="blue">📋</span>
                <h3>Booking Summary</h3>
              </div>
              <div className="ir-detail-grid">
                <DetailRow label="Booking ID" value={booking._id?.slice(-6)?.toUpperCase() || "-"} />
                <DetailRow label="Status">
                  <span className={`status-pill ${statusClass}`}>{booking.status}</span>
                </DetailRow>
                <DetailRow label="Package" value={booking.package_id?.name || "Custom"} />
                <DetailRow label="Total Price" value={formatCurrency(booking.total_price)} />
                <DetailRow label="Payment Status">
                  <span className={`status-pill ${paymentStatusClass}`}>{booking.payment_status || "pending"}</span>
                </DetailRow>
                <DetailRow label="Payment Method" value={booking.payment_method || "-"} />
                <DetailRow label="Created" value={formatDateTime(booking.createdAt)} />
                {booking.completed_at && (
                  <DetailRow label="Completed" value={formatDateTime(booking.completed_at)} />
                )}
              </div>
            </div>

            {/* Event Details */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="purple">🎉</span>
                <h3>Event Details</h3>
              </div>
              <div className="ir-detail-grid">
                <DetailRow label="Event Type" value={booking.event_type || "-"} />
                <DetailRow label="Event Theme" value={booking.event_theme || "-"} />
                <DetailRow label="Event Date" value={formatDate(booking.event_date)} />
                <DetailRow label="Start Time" value={booking.start_time || "-"} />
                <DetailRow label="Guest Count" value={booking.guest_count || "-"} />
                <DetailRow label="Duration (hrs)" value={booking.duration_hours || "-"} />
                <DetailRow label="Include Food" value={booking.include_food ? "Yes" : "No"} />
              </div>
            </div>

            {/* Venue Information */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="green">📍</span>
                <h3>Venue Information</h3>
              </div>
              <div className="ir-detail-grid">
                <DetailRow label="Venue Type" value={booking.venue_type || "-"} />
                <DetailRow label="Indoor/Outdoor" value={booking.indoor_outdoor || "-"} />
                <DetailRow label="Full Address" value={fullAddress || "-"} />
                <DetailRow label="Province" value={booking.province || "-"} />
                <DetailRow label="Municipality" value={booking.municipality || "-"} />
                <DetailRow label="Barangay" value={booking.barangay || "-"} />
                <DetailRow label="Street" value={booking.street || "-"} />
                <DetailRow label="Landmark" value={booking.landmark || "-"} />
                <DetailRow label="Zip Code" value={booking.zip_code || "-"} />
              </div>

              {(booking.venue_contact_name || booking.venue_contact_phone) && (
                <>
                  <div className="ir-sub-heading">Venue Contact Person</div>
                  <div className="ir-detail-grid">
                    <DetailRow label="Name" value={booking.venue_contact_name || "-"} />
                    <DetailRow label="Contact Number" value={booking.venue_contact_phone || "-"} />
                  </div>
                </>
              )}
            </div>

            {/* Staff & Manager Assignments */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="indigo">👥</span>
                <h3>Team Assignments</h3>
              </div>
              <div className="ir-detail-grid">
                <DetailRow label="Manager" value={booking.manager_id?.full_name || "Not assigned"} />
              </div>

              {Array.isArray(booking.staff_assignments) && booking.staff_assignments.length > 0 && (
                <>
                  <div className="ir-sub-heading">Staff Assignments</div>
                  <div className="ir-detail-grid">
                    {booking.staff_assignments.map((staff, idx) => (
                      <DetailRow key={`staff-${idx}`} label={staff.role || "Staff"}>
                        {staff.name || "N/A"}{staff.phone ? ` · ${staff.phone}` : ""}
                      </DetailRow>
                    ))}
                  </div>
                </>
              )}

              {Array.isArray(booking.staff_ids) && booking.staff_ids.length > 0 && (
                <>
                  <div className="ir-sub-heading">Assigned Staff Members</div>
                  <div className="ir-tag-list">
                    {booking.staff_ids.map((staff) => (
                      <span key={staff._id || staff} className="ir-tag">
                        {staff.full_name || staff._id?.slice(-6) || "Staff"}
                      </span>
                    ))}
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
                <DetailRow label="Customer" value={booking.customer_id?.full_name || "-"} />
                <DetailRow label="Email" value={booking.contact_email || booking.customer_id?.email || "-"} />
                <DetailRow label="First Name" value={booking.contact_first_name || "-"} />
                <DetailRow label="Last Name" value={booking.contact_last_name || "-"} />
                <DetailRow label="Phone" value={booking.contact_phone || "-"} />
                <DetailRow label="Alt. Phone" value={booking.contact_alt_phone || "N/A"} />
                <DetailRow label="Preferred Contact" value={booking.contact_method || "-"} />
              </div>
            </div>

            {/* Payment Summary */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="gold">💰</span>
                <h3>Payment Summary</h3>
              </div>
              <div className="ir-detail-grid">
                <DetailRow label="Total Price" value={formatCurrency(totalPrice)} />
                <DetailRow label="Total Paid" value={formatCurrency(totalPaid)} />
                <DetailRow label="Balance" value={formatCurrency(balance > 0 ? balance : 0)} />
              </div>

              {payments.length > 0 && (
                <>
                  <div className="ir-sub-heading">Payment Records</div>
                  <div className="bd-payment-records">
                    {payments.map((p) => (
                      <div key={p._id} className="bd-payment-record">
                        <div className="bd-payment-record-top">
                          <span className="bd-payment-type">{p.payment_type || "Payment"}</span>
                          <span className={`status-pill ${p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "pending"}`}>
                            {p.status}
                          </span>
                        </div>
                        <div className="bd-payment-record-details">
                          <span>{formatCurrency(p.amount)}</span>
                          <span className="bd-payment-date">{p.method || "-"} · {formatDate(p.paid_at || p.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Menu Selection */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="orange">🍽️</span>
                <h3>Menu Selection</h3>
              </div>
              {Array.isArray(booking.selected_menu) && booking.selected_menu.length > 0 ? (
                <div className="ir-tag-list">
                  {booking.selected_menu.map((item) => (
                    <span key={item} className="ir-tag">{item}</span>
                  ))}
                </div>
              ) : (
                <p className="ir-empty-text">No menu selections.</p>
              )}
              {Array.isArray(booking.menu_items) && booking.menu_items.length > 0 && (
                <>
                  <div className="ir-sub-heading">Menu Items Detail</div>
                  <div className="ir-detail-grid">
                    {booking.menu_items.map((item, idx) => (
                      <DetailRow key={`mi-${idx}`} label={item.name}>
                        {item.note || "-"}{item.price ? ` · ${formatCurrency(item.price)}` : ""}
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
                <DetailRow label="Dietary Restrictions" value={booking.dietary_restrictions || "None"} />
                <DetailRow label="Allergies" value={booking.allergies || "None"} />
              </div>
            </div>

            {/* Additional Services */}
            <div className="ir-section-card">
              <div className="ir-section-header">
                <span className="ir-section-icon" data-color="indigo">⚙️</span>
                <h3>Additional Services</h3>
              </div>
              {Array.isArray(booking.additional_services) && booking.additional_services.length > 0 ? (
                <div className="ir-tag-list">
                  {booking.additional_services.map((item) => (
                    <span key={item} className="ir-tag">{item}</span>
                  ))}
                </div>
              ) : (
                <p className="ir-empty-text">No additional services.</p>
              )}
              {Array.isArray(booking.service_items) && booking.service_items.length > 0 && (
                <>
                  <div className="ir-sub-heading">Service Items Detail</div>
                  <div className="ir-detail-grid">
                    {booking.service_items.map((item, idx) => (
                      <DetailRow key={`si-${idx}`} label={item.name}>
                        Qty {item.quantity || 0}{item.price ? ` · ${formatCurrency(item.price)}` : ""}
                      </DetailRow>
                    ))}
                  </div>
                </>
              )}

              {Array.isArray(booking.additional_charges) && booking.additional_charges.length > 0 && (
                <>
                  <div className="ir-sub-heading">Additional Charges</div>
                  <div className="ir-detail-grid">
                    {booking.additional_charges.map((charge, idx) => (
                      <DetailRow key={`ac-${idx}`} label={charge.name} value={formatCurrency(charge.amount)} />
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
              <p className="ir-special-requests">{booking.special_requests || "N/A"}</p>
            </div>

            {/* Manager Notes */}
            {Array.isArray(booking.manager_notes) && booking.manager_notes.length > 0 && (
              <div className="ir-section-card">
                <div className="ir-section-header">
                  <span className="ir-section-icon" data-color="blue">🗒️</span>
                  <h3>Manager Notes</h3>
                </div>
                <div className="bd-notes-list">
                  {booking.manager_notes.map((note, idx) => (
                    <div key={`mn-${idx}`} className="bd-note-item">
                      <p className="bd-note-text">{note.note}</p>
                      <span className="bd-note-date">{formatDateTime(note.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Staff Reports */}
            {Array.isArray(booking.staff_reports) && booking.staff_reports.length > 0 && (
              <div className="ir-section-card">
                <div className="ir-section-header">
                  <span className="ir-section-icon" data-color="teal">📊</span>
                  <h3>Staff Reports</h3>
                </div>
                <div className="bd-notes-list">
                  {booking.staff_reports.map((report, idx) => (
                    <div key={`sr-${idx}`} className="bd-note-item">
                      <div className="bd-note-meta">
                        <span className="ir-tag">{report.role || "Staff"}</span>
                      </div>
                      <p className="bd-note-text">{report.note}</p>
                      <span className="bd-note-date">{formatDateTime(report.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {completeTarget && (
        <ConfirmDialog
          message={`Mark booking ${bookingCode} as completed?`}
          onConfirm={handleMarkComplete}
          onCancel={() => setCompleteTarget(false)}
        />
      )}
      {cancelTarget && (
        <ConfirmDialog
          message={`Cancel booking ${bookingCode}? This cannot be undone.`}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(false)}
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
