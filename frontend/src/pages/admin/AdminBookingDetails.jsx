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
  const [staffList, setStaffList] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignment, setAssignment] = useState({
    headCook: "",
    servers: [""],
    setupCrew: ["", ""],
    assistants: [""],
    extraAssistants: [{ name: "", phone: "" }]
  });
  const [returnsData, setReturnsData] = useState({});

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

    AdminAPI.getStaff()
      .then((res) => setStaffList(Array.isArray(res.data) ? res.data : []))
      .catch(() => setStaffList([]));
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (booking && Array.isArray(booking.inventory_items)) {
      const initial = {};
      booking.inventory_items.forEach(item => {
        const existingReturn = (booking.equipment_returns || []).find(r => r.inventory_id === item.inventory_id);
        initial[item.inventory_id] = existingReturn && existingReturn.verified_at 
          ? existingReturn.quantity_returned 
          : item.quantity;
      });
      setReturnsData(initial);
    }
  }, [booking]);

  const handleVerifyReturns = () => {
    setSubmitting(true);
    const payload = {
      returns: Object.keys(returnsData).map(invId => ({
        inventory_id: invId,
        quantity_returned: parseInt(returnsData[invId] || 0, 10)
      }))
    };
    AdminAPI.verifyEquipmentReturns(booking._id, payload)
      .then(res => {
        notify("Equipment returns verified.", "success");
        setBooking(res.data);
      })
      .catch(err => {
        notify(err.response?.data?.message || "Failed to verify returns", "error");
      })
      .finally(() => setSubmitting(false));
  };

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

  const staffMap = useMemo(() => {
    const map = {};
    staffList.forEach((person) => {
      map[person._id] = person;
    });
    return map;
  }, [staffList]);

  const openAssign = () => {
    setAssignment({
      headCook: "",
      servers: [""],
      setupCrew: ["", ""],
      assistants: [""],
      extraAssistants: [{ name: "", phone: "" }]
    });
    setShowAssignModal(true);
  };

  const addAssignmentSlot = (key) => {
    setAssignment((prev) => ({
      ...prev,
      [key]: [...prev[key], ""]
    }));
  };

  const addExtraAssistant = () => {
    setAssignment((prev) => ({
      ...prev,
      extraAssistants: [...prev.extraAssistants, { name: "", phone: "" }]
    }));
  };

  const updateAssignment = (key, index, value) => {
    setAssignment((prev) => {
      const next = [...prev[key]];
      next[index] = value;
      return { ...prev, [key]: next };
    });
  };

  const updateExtraAssistant = (index, field, value) => {
    setAssignment((prev) => {
      const next = prev.extraAssistants.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      );
      return { ...prev, extraAssistants: next };
    });
  };

  const submitAssignment = () => {
    if (!booking) return;
    const staffAssignments = [];
    if (assignment.headCook) {
      staffAssignments.push({
        role: "Head Cook",
        user_id: assignment.headCook,
        name: staffMap[assignment.headCook]?.full_name,
        phone: staffMap[assignment.headCook]?.phone
      });
    }
    assignment.servers.filter(Boolean).forEach((id) => {
      staffAssignments.push({
        role: "Server",
        user_id: id,
        name: staffMap[id]?.full_name,
        phone: staffMap[id]?.phone
      });
    });
    assignment.setupCrew.filter(Boolean).forEach((id) => {
      staffAssignments.push({
        role: "Setup Crew",
        user_id: id,
        name: staffMap[id]?.full_name,
        phone: staffMap[id]?.phone
      });
    });
    assignment.assistants.filter(Boolean).forEach((id) => {
      staffAssignments.push({
        role: "Assistant",
        user_id: id,
        name: staffMap[id]?.full_name,
        phone: staffMap[id]?.phone
      });
    });
    assignment.extraAssistants
      .filter((extra) => extra.name || extra.phone)
      .forEach((extra) => {
        staffAssignments.push({
          role: "Assistant",
          name: extra.name,
          phone: extra.phone
        });
      });

    if (staffAssignments.length === 0) {
      notify("Please assign at least one staff member.", "error");
      return;
    }

    AdminAPI.assignStaff(booking._id, { staff_assignments: staffAssignments })
      .then(() => {
        notify("Staff assignment saved.", "success");
        setShowAssignModal(false);
        load();
      })
      .catch((err) => {
        notify(err.response?.data?.message || "We could not assign staff. Please try again.", "error");
      });
  };

  const getServiceTypeLabel = () => {
    if (!booking) return "Event";
    const inquiryService = booking.inquiry_id?.service_type;
    if (inquiryService === "food_only") return "Food Only";
    if (inquiryService === "event_only") return "Event Setup Only";
    if (inquiryService === "food_event") return "Food & Event Setup";

    const hasServices =
      (Array.isArray(booking.additional_services) && booking.additional_services.length > 0) ||
      (Array.isArray(booking.service_items) && booking.service_items.length > 0);
    if (booking.include_food && hasServices) return "Food & Event Setup";
    if (booking.include_food) return "Food Only";
    return "Event Setup Only";
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
                  {!isTerminal && (
                    <button
                      className="ir-action-btn ir-action-primary"
                      type="button"
                      onClick={openAssign}
                      disabled={submitting}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 7.5c1.5 0 2.5 1 2.5 2.5V11a.5.5 0 0 1-.5.5H1.5a.5.5 0 0 1-.5-.5v-1c0-1.5 1-2.5 2.5-2.5h7z"/><circle cx="7" cy="4" r="2.5"/></svg>
                      Assign Team
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

            {/* Equipment Returns Verification */}
            {Array.isArray(booking.inventory_items) && booking.inventory_items.length > 0 && (
              <div className="ir-section-card">
                <div className="ir-section-header">
                  <span className="ir-section-icon" data-color="orange">📦</span>
                  <h3>Equipment Returns</h3>
                </div>
                
                <div className="bd-notes-list">
                   {booking.inventory_items.map((item, idx) => {
                       const returnRec = (booking.equipment_returns || []).find(r => r.inventory_id === item.inventory_id);
                       const isVerified = returnRec && returnRec.verified_at;
                       
                       return (
                          <div key={idx} className="bd-note-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <div>
                               <div className="font-semibold text-slate-800">{item.name}</div>
                               <div className="text-xs text-slate-500">Booked: {item.quantity}</div>
                             </div>
                             
                             <div className="flex items-center gap-2">
                               {isVerified && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Verified</span>}
                               {["ongoing", "completed"].includes(booking.status) ? (
                                  <input 
                                    type="number"
                                    min="0"
                                    max={item.quantity}
                                    value={returnsData[item.inventory_id] ?? item.quantity}
                                    onChange={(e) => setReturnsData({ ...returnsData, [item.inventory_id]: e.target.value })}
                                    className="border rounded p-1 w-20 text-center"
                                  />
                               ) : (
                                  <span className="font-semibold">{returnRec?.quantity_returned || (isVerified ? 0 : "Pending")} Returned</span>
                               )}
                             </div>
                          </div>
                       )
                   })}
                </div>
                
                {["ongoing", "completed"].includes(booking.status) && (
                   <div className="mt-4 flex justify-end">
                      <button 
                         className="btn bg-blue-600 text-white px-4 py-2 rounded text-sm"
                         onClick={handleVerifyReturns}
                         disabled={submitting}
                      >
                         {submitting ? "Saving..." : "Verify & Save Returns"}
                      </button>
                   </div>
                )}
              </div>
            )}

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

      {showAssignModal && (
        <Modal title="Staff Assignment" onClose={() => setShowAssignModal(false)}>
          <div className="space-y-6 text-sm px-1 max-h-[70vh] overflow-y-auto">
            <div className="p-4 border rounded-2xl border-slate-200 bg-slate-50">
              <div className="flex flex-wrap justify-between gap-4 text-xs text-slate-600">
                <div>
                  <div className="font-semibold text-ink-900">Customer</div>
                  <div>{booking.customer_id?.full_name || "Customer"}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink-900">Date</div>
                  <div>{formatDate(booking.event_date)}</div>
                </div>
                <div>
                  <div className="font-semibold text-ink-900">Service Type</div>
                  <span className="chip">{getServiceTypeLabel()}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Kitchen Staff</div>
              <div className="p-3 mt-2 border rounded-2xl border-slate-200">
                <label className="text-xs font-semibold text-slate-500">Assign Head Cook</label>
                <select
                  className="w-full p-2 mt-2 border rounded"
                  value={assignment.headCook}
                  onChange={(event) => setAssignment((prev) => ({ ...prev, headCook: event.target.value }))}
                >
                  <option value="">Select Head Cook</option>
                  {staffList.map((person) => (
                    <option key={person._id} value={person._id}>{person.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Servers</div>
              <div className="p-3 mt-2 space-y-2 border rounded-2xl border-slate-200">
                {assignment.servers.map((value, index) => (
                  <select
                    key={`server-${index}`}
                    className="w-full p-2 border rounded"
                    value={value}
                    onChange={(event) => updateAssignment("servers", index, event.target.value)}
                  >
                    <option value="">Select Server</option>
                    {staffList.map((person) => (
                      <option key={person._id} value={person._id}>{person.full_name}</option>
                    ))}
                  </select>
                ))}
                <button className="btn-outline w-full p-2 mt-2 border rounded hover:bg-slate-50" type="button" onClick={() => addAssignmentSlot("servers")}>+ Add Server</button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Setup Crew</div>
              <div className="p-3 mt-2 space-y-2 border rounded-2xl border-slate-200">
                {assignment.setupCrew.map((value, index) => (
                  <select
                    key={`setup-${index}`}
                    className="w-full p-2 border rounded"
                    value={value}
                    onChange={(event) => updateAssignment("setupCrew", index, event.target.value)}
                  >
                    <option value="">Select Setup Crew</option>
                    {staffList.map((person) => (
                      <option key={person._id} value={person._id}>{person.full_name}</option>
                    ))}
                  </select>
                ))}
                <button className="btn-outline w-full p-2 mt-2 border rounded hover:bg-slate-50" type="button" onClick={() => addAssignmentSlot("setupCrew")}>+ Add Setup Crew</button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assistants</div>
              <div className="p-3 mt-2 space-y-2 border rounded-2xl border-slate-200">
                {assignment.assistants.map((value, index) => (
                  <select
                    key={`assistant-${index}`}
                    className="w-full p-2 border rounded"
                    value={value}
                    onChange={(event) => updateAssignment("assistants", index, event.target.value)}
                  >
                    <option value="">Select Assistant</option>
                    {staffList.map((person) => (
                      <option key={person._id} value={person._id}>{person.full_name}</option>
                    ))}
                  </select>
                ))}
                <button className="btn-outline w-full p-2 mt-2 border rounded hover:bg-slate-50" type="button" onClick={() => addAssignmentSlot("assistants")}>+ Add Assistant</button>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Extra Assistants (Not in System)</div>
              <div className="p-3 mt-2 space-y-2 border rounded-2xl border-slate-200">
                {assignment.extraAssistants.map((item, index) => (
                  <div key={`extra-${index}`} className="grid gap-2 sm:grid-cols-2">
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Name"
                      value={item.name}
                      onChange={(event) => updateExtraAssistant(index, "name", event.target.value)}
                    />
                    <input
                      className="w-full p-2 border rounded"
                      placeholder="Contact Number"
                      value={item.phone}
                      onChange={(event) => updateExtraAssistant(index, "phone", event.target.value)}
                    />
                  </div>
                ))}
                <button className="btn-outline w-full p-2 mt-2 border rounded hover:bg-slate-50" type="button" onClick={addExtraAssistant}>+ Add Extra Assistant</button>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
              <button className="btn-outline px-4 py-2 rounded hover:bg-slate-50" type="button" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button className="btn bg-blue-600 text-white px-4 py-2 rounded" type="button" onClick={submitAssignment}>Finalize Team</button>
            </div>
          </div>
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
