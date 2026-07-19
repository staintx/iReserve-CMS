import { useEffect, useState } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
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
  const [packages, setPackages] = useState([]);
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [requestTypeFilter, setRequestTypeFilter] = useState("all");
  const { notify } = useToast();
  const navigate = useNavigate();

  const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

  const getDateOnly = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const eventTypeOptions = useMemo(
    () => Array.from(new Set(inquiries.map((inq) => inq.event_type).filter(Boolean))),
    [inquiries]
  );

  const load = () =>
    AdminAPI.getInquiries().then((res) => {
      setInquiries(res.data);
      if (res.data.length > 0) setSelected(res.data[0]);
    });

  useEffect(() => {
    load();
    AdminAPI.getPackages().then((res) => {
      setPackages(res?.data || []);
    });
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
    const text = `${inq._id || ""} ${inq.event_type || ""} ${inq.customer_id?.full_name || ""} ${inq.contact_first_name || ""} ${inq.contact_last_name || ""}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || inq.status === statusFilter;
    const matchesEventType = eventTypeFilter === "all" || inq.event_type === eventTypeFilter;
    const matchesRequestType =
      requestTypeFilter === "all" ||
      inq.service_type === requestTypeFilter ||
      (requestTypeFilter === "Food Only" && inq.include_food === true && !inq.include_setup) ||
      (requestTypeFilter === "Event Setup" && inq.include_setup === true && !inq.include_food) ||
      (requestTypeFilter === "Food & Event" && inq.include_food === true && inq.include_setup === true);
    const matchesDate = (() => {
      if (dateRangeFilter === "all") return true;
      if (!inq.event_date) return false;

      const eventDate = new Date(inq.event_date);
      const eventDateOnly = getDateOnly(eventDate);
      const today = new Date();
      const todayOnly = getDateOnly(today);
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

      switch (dateRangeFilter) {
        case "today":
          return eventDateOnly === todayOnly;
        case "week":
          return eventDate >= startOfWeek && eventDate <= endOfWeek;
        case "month":
          return eventDate >= startOfMonth && eventDate <= endOfMonth;
        case "custom":
          return dateFilter ? eventDateOnly === dateFilter : false;
        default:
          return true;
      }
    })();

    return matchesQuery && matchesStatus && matchesEventType && matchesRequestType && matchesDate;
  });

  const summaryText = useMemo(() => {
    if (filtered.length === 0) return "Showing 0 inquiries";
    return `Showing 1-${filtered.length} of ${filtered.length} inquiries`;
  }, [filtered.length]);

  const openQuotePage = (inq) => {
    navigate(`/admin/inquiries/${inq._id}/quote`);
  };

  const openReviewPage = (inq) => {
    navigate(`/admin/inquiries/${inq._id}/review`);
  };

  const hasActiveFilters =
    query !== "" ||
    statusFilter !== "all" ||
    eventTypeFilter !== "all" ||
    requestTypeFilter !== "all" ||
    dateRangeFilter !== "all" ||
    dateFilter !== "";

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setEventTypeFilter("all");
    setDateRangeFilter("all");
    setDateFilter("");
    setRequestTypeFilter("all");
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
          <Search className="search-icon" size={16} />
          <input placeholder="Search by client name, inquiry ID, or event type..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="admin-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="quoted">Awaiting Payment</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <select className="admin-filter" value={dateRangeFilter} onChange={(e) => setDateRangeFilter(e.target.value)}>
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom</option>
          </select>
          {dateRangeFilter === "custom" && <input type="date" className="admin-filter" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />}
        </div>
        <select className="admin-filter" value={eventTypeFilter} onChange={(e) => setEventTypeFilter(e.target.value)}>
          <option value="all">All Event Types</option>
          {eventTypeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select className="admin-filter" value={requestTypeFilter} onChange={(e) => setRequestTypeFilter(e.target.value)}>
          <option value="all">All Request Types</option>
          <option value="Food Only">Food Only</option>
          <option value="Event Setup">Setup Only</option>
          <option value="Food & Event">Food & Event Setup</option>
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            className="admin-filter"
            onClick={resetFilters}
            style={{
              backgroundColor: "#1e3a8a",
              color: "#ffffff",
              border: "1px solid #1e3a8a",
              borderRadius: "999px",
              cursor: "pointer",
              transition: "background-color 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#172554";
              e.currentTarget.style.borderColor = "#172554";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#1e3a8a";
              e.currentTarget.style.borderColor = "#1e3a8a";
            }}
          >
            Clear Filters
          </button>
        )}
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
          onReview={openReviewPage}
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