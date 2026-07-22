import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import useToast from "../../hooks/useToast";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Modal from "../../components/common/Modal";

/* ── Status helpers ── */
const ACTIVE_STATUSES = ["pending deposit", "confirmed", "preparing", "ongoing"];
const ALL_STATUSES = ["pending deposit", "confirmed", "preparing", "ongoing", "completed", "cancelled"];

const STATUS_LABELS = {
  "pending deposit": "Pending Deposit",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled"
};

const STATUS_CLASS_MAP = {
  "pending deposit": "warning",
  confirmed: "approved",
  preparing: "info",
  ongoing: "ongoing",
  completed: "approved",
  cancelled: "rejected"
};

const getStatusClass = (status) => STATUS_CLASS_MAP[status] || "pending";
const getStatusLabel = (status) => STATUS_LABELS[status] || status;

export default function AdminBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [booking, setBooking] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [packages, setPackages] = useState([]);

  const load = () => {
    AdminAPI.getBooking(id)
      .then((res) => {
        setBooking(res.data);
        setLoading(false);
      })
      .catch(() => {
        notify("Could not load booking details. Please try again.", "error");
        setLoading(false);
      });

    AdminAPI.getPayments()
      .then((res) => {
        setPayments(res.data.filter((p) => String(p.booking_id?._id || p.booking_id) === id));
      })
      .catch(() => setPayments([]));

    AdminAPI.getPackages()
      .then((res) => setPackages(res.data))
      .catch(() => setPackages([]));
  };

  useEffect(() => {
    load();
  }, [id]);

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

  const openEditModal = () => {
    setEditForm({
      guest_count: booking.guest_count || "",
      venue_type: booking.venue_type || "",
      indoor_outdoor: booking.indoor_outdoor || "",
      province: booking.province || "",
      municipality: booking.municipality || "",
      barangay: booking.barangay || "",
      street: booking.street || "",
      landmark: booking.landmark || "",
      zip_code: booking.zip_code || "",
      event_date: booking.event_date ? new Date(booking.event_date).toISOString().split("T")[0] : "",
      start_time: booking.start_time || "",
      contact_first_name: booking.contact_first_name || "",
      contact_last_name: booking.contact_last_name || "",
      contact_email: booking.contact_email || "",
      contact_phone: booking.contact_phone || "",
      contact_alt_phone: booking.contact_alt_phone || "",
      special_requests: booking.special_requests || "",
      event_theme: booking.event_theme || "",
      package_id: booking.package_id?._id || booking.package_id || "",
      selected_menu: booking.selected_menu?.join(", ") || "",
      additional_services: booking.additional_services?.join(", ") || "",
      total_price: booking.total_price || 0
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const payload = { ...editForm };
    if (typeof payload.selected_menu === 'string') {
        payload.selected_menu = payload.selected_menu.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (typeof payload.additional_services === 'string') {
        payload.additional_services = payload.additional_services.split(',').map(s => s.trim()).filter(Boolean);
    }
    delete payload.event_date; // Prevent altering event_date

    AdminAPI.updateBooking(booking._id, payload)
      .then((res) => {
        setBooking(res.data);
        setShowEditModal(false);
        notify("Booking details updated.", "success");
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Could not update booking details.", "error");
      })
      .finally(() => setSubmitting(false));
  };

  const handleStatusChange = (newStatus) => {
    if (!booking || submitting) return;
    setSubmitting(true);
    const payload = { status: newStatus };
    if (newStatus === "completed") payload.completed_at = new Date().toISOString();
    AdminAPI.updateBooking(booking._id, payload)
      .then((res) => {
        notify(`Status updated to "${getStatusLabel(newStatus)}".`, "success");
        setBooking(res.data);
        setSubmitting(false);
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Could not update status.", "error");
        setSubmitting(false);
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

  const statusClass = getStatusClass(booking.status);
  const isTerminal = ["completed", "cancelled"].includes(booking.status);

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

  const msUntilEvent = new Date(booking.event_date).getTime() - Date.now();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const isLockedOut = msUntilEvent <= threeDaysMs;
  const changeRequest = booking.change_request?.status === "pending" ? booking.change_request : null;

  /* Determine which statuses admin can transition to */
  const getNextStatuses = () => {
    switch (booking.status) {
      case "pending deposit": return ["confirmed", "cancelled"];
      case "confirmed": return ["preparing", "cancelled"];
      case "preparing": return ["ongoing", "cancelled"];
      case "ongoing": return ["completed"];
      default: return [];
    }
  };
  const nextStatuses = getNextStatuses();

  return (
    <AdminLayout>
      <div className="ir-review-page">
        {/* ── Top Navigation ── */}
        <div className="ir-review-topbar">
          <button className="ir-back-btn" type="button" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                  <span className={`status-pill ${statusClass}`}>{getStatusLabel(booking.status)}</span>
                  <span className="ir-review-meta-sep">·</span>
                  <span className={`status-pill ${paymentStatusClass}`}>Payment: {booking.payment_status || "pending"}</span>
                  <span className="ir-review-meta-sep">·</span>
                  <span className="ir-review-date">Created {formatDate(booking.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="ir-review-actions">
              {!isTerminal && (
                <>
                  {nextStatuses.filter((s) => s !== "cancelled").map((next) => (
                    <button
                      key={next}
                      className={`ir-action-btn ${next === "completed" ? "ir-action-success" : "ir-action-primary"}`}
                      type="button"
                      onClick={() => handleStatusChange(next)}
                      disabled={submitting}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 7h7M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {submitting ? "Updating…" : `Mark ${getStatusLabel(next)}`}
                    </button>
                  ))}
                  {nextStatuses.includes("cancelled") && (
                    <button
                      className="ir-action-btn ir-action-decline"
                      type="button"
                      onClick={() => setCancelTarget(true)}
                      disabled={submitting}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10.5 3.5L3.5 10.5M3.5 3.5l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      Cancel Booking
                    </button>
                  )}
                  {!isLockedOut && (
                    <button
                      className="ir-action-btn ir-action-primary"
                      style={{ background: "#475569" }}
                      type="button"
                      onClick={openEditModal}
                      disabled={submitting}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 3.5l1 1M11.5 2.5a1.414 1.414 0 010 2L4 12H2v-2l7.5-7.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Edit Details
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Status Banners ── */}
          {booking.status === "pending deposit" && (
            <div className="ir-review-banner ir-banner-warning">
              <span className="ir-banner-icon">💳</span>
              <div>
                <strong>Awaiting Deposit Payment</strong>
                <p>This booking is waiting for the customer to pay the deposit. Once received, mark it as "Confirmed".</p>
              </div>
            </div>
          )}
          {booking.status === "confirmed" && (
            <div className="ir-review-banner ir-banner-success">
              <span className="ir-banner-icon">✅</span>
              <div>
                <strong>Booking Confirmed</strong>
                <p>Deposit received. Event is scheduled for {formatDate(booking.event_date)}. Move to "Preparing" when the team begins setup.</p>
              </div>
            </div>
          )}
          {booking.status === "preparing" && (
            <div className="ir-review-banner ir-banner-info">
              <span className="ir-banner-icon">🔧</span>
              <div>
                <strong>Preparation In Progress</strong>
                <p>The team is actively preparing for the event on {formatDate(booking.event_date)}.</p>
              </div>
            </div>
          )}
          {booking.status === "ongoing" && (
            <div className="ir-review-banner ir-banner-info">
              <span className="ir-banner-icon">🎉</span>
              <div>
                <strong>Event In Progress</strong>
                <p>The event is currently happening. Mark as "Completed" when finished.</p>
              </div>
            </div>
          )}
          {booking.status === "completed" && (
            <div className="ir-review-banner ir-banner-success">
              <span className="ir-banner-icon">🏁</span>
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
          {changeRequest && (
            <div className="ir-review-banner ir-banner-info">
              <span className="ir-banner-icon">📝</span>
              <div>
                <strong>Customer change request</strong>
                <p>{changeRequest.message}</p>
                <p>Requested {formatDateTime(changeRequest.requested_at)}</p>
              </div>
            </div>
          )}

          {/* ── Status Progress Tracker ── */}
          {!isTerminal && (
            <div className="bd-status-tracker">
              {ACTIVE_STATUSES.map((s, idx) => {
                const currentIdx = ACTIVE_STATUSES.indexOf(booking.status);
                const isPast = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={s} className={`bd-status-step ${isPast ? "past" : ""} ${isCurrent ? "current" : ""}`}>
                    <div className="bd-status-dot">
                      {isPast ? "✓" : idx + 1}
                    </div>
                    <span className="bd-status-label">{getStatusLabel(s)}</span>
                    {idx < ACTIVE_STATUSES.length - 1 && <div className={`bd-status-line ${isPast ? "past" : ""}`} />}
                  </div>
                );
              })}
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
                  <span className={`status-pill ${statusClass}`}>{getStatusLabel(booking.status)}</span>
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

      {cancelTarget && (
        <ConfirmDialog
          message={`Cancel booking ${bookingCode}? This cannot be undone.`}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(false)}
        />
      )}

      {showEditModal && (
        <Modal title="Edit Booking Details" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            
            <div className="font-semibold text-slate-700 mt-0">Event Details</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label>Event Date (Unalterable)</label>
                <input type="date" value={editForm.event_date} disabled className="bg-slate-100 cursor-not-allowed text-slate-500 w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Start Time</label>
                <input type="time" value={editForm.start_time} onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} required className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Guest Count</label>
                <input type="number" value={editForm.guest_count} onChange={(e) => setEditForm({ ...editForm, guest_count: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Event Theme</label>
                <input type="text" value={editForm.event_theme} onChange={(e) => setEditForm({ ...editForm, event_theme: e.target.value })} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="font-semibold text-slate-700 mt-4 border-t pt-4">Venue Details</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label>Venue Type</label>
                <input type="text" value={editForm.venue_type} onChange={(e) => setEditForm({ ...editForm, venue_type: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Indoor / Outdoor</label>
                <select value={editForm.indoor_outdoor} onChange={(e) => setEditForm({ ...editForm, indoor_outdoor: e.target.value })} className="w-full p-2 border rounded">
                  <option value="">Select...</option>
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                </select>
              </div>
              <div className="form-group">
                <label>Province</label>
                <input type="text" value={editForm.province} onChange={(e) => setEditForm({ ...editForm, province: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Municipality</label>
                <input type="text" value={editForm.municipality} onChange={(e) => setEditForm({ ...editForm, municipality: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Barangay</label>
                <input type="text" value={editForm.barangay} onChange={(e) => setEditForm({ ...editForm, barangay: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Street</label>
                <input type="text" value={editForm.street} onChange={(e) => setEditForm({ ...editForm, street: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Landmark</label>
                <input type="text" value={editForm.landmark} onChange={(e) => setEditForm({ ...editForm, landmark: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Zip Code</label>
                <input type="text" value={editForm.zip_code} onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="font-semibold text-slate-700 mt-4 border-t pt-4">Package & Menu</div>
            <div className="grid grid-cols-1 gap-4">
              <div className="form-group">
                <label>Package</label>
                <select value={editForm.package_id} onChange={(e) => setEditForm({ ...editForm, package_id: e.target.value })} className="w-full p-2 border rounded">
                  <option value="">No Package (Custom)</option>
                  {packages.map(p => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Selected Menu (Comma separated)</label>
                <input type="text" value={editForm.selected_menu} onChange={(e) => setEditForm({ ...editForm, selected_menu: e.target.value })} placeholder="e.g. Adobo, Sinigang, Lechon" className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Add-ons / Additional Services (Comma separated)</label>
                <input type="text" value={editForm.additional_services} onChange={(e) => setEditForm({ ...editForm, additional_services: e.target.value })} placeholder="e.g. Photo Booth, Extra Tables" className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="font-semibold text-slate-700 mt-4 border-t pt-4">Contact Information</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label>First Name</label>
                <input type="text" value={editForm.contact_first_name} onChange={(e) => setEditForm({ ...editForm, contact_first_name: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input type="text" value={editForm.contact_last_name} onChange={(e) => setEditForm({ ...editForm, contact_last_name: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={editForm.contact_email} onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Primary Phone</label>
                <input type="text" value={editForm.contact_phone} onChange={(e) => setEditForm({ ...editForm, contact_phone: e.target.value })} className="w-full p-2 border rounded" />
              </div>
              <div className="form-group">
                <label>Alt. Phone</label>
                <input type="text" value={editForm.contact_alt_phone} onChange={(e) => setEditForm({ ...editForm, contact_alt_phone: e.target.value })} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="font-semibold text-slate-700 mt-4 border-t pt-4">Other</div>
            <div className="form-group">
              <label>Special Requests</label>
              <textarea value={editForm.special_requests} onChange={(e) => setEditForm({ ...editForm, special_requests: e.target.value })} className="w-full p-2 border rounded" />
            </div>
            <div className="form-group">
              <label>Total Price Override (PHP)</label>
              <input type="number" value={editForm.total_price} onChange={(e) => setEditForm({ ...editForm, total_price: e.target.value })} min="0" className="w-full p-2 border rounded" />
              <p className="text-xs text-slate-500 mt-1">Modifying this will automatically update the remaining balance.</p>
            </div>
            
            <div className="actions pt-4 mt-6 border-t flex gap-2">
              <button className="btn bg-blue-600 text-white px-4 py-2 rounded" type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</button>
              <button className="btn-outline border border-gray-300 px-4 py-2 rounded hover:bg-gray-50" type="button" onClick={() => setShowEditModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
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
