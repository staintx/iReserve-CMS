import { useEffect, useState } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminInquiriesTable from "../../components/tables/AdminInquiriesTable";
import useToast from "../../hooks/useToast";


export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);

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
    });

  useEffect(() => {
    load();
    AdminAPI.getPackages().then((res) => {
      setPackages(res?.data || []);
    });
    AdminAPI.getStaff().then(() => {});
  }, []);



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
          <option value="new">New</option>
          <option value="under review">Under Review</option>
          <option value="awaiting confirmation">Awaiting Confirmation</option>
          <option value="negotiating">Negotiating</option>
          <option value="confirmed">Confirmed</option>
          <option value="declined">Declined</option>
          <option value="abandoned">Abandoned</option>
          <option value="expired">Expired</option>
          <option value="spam">Spam</option>
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
          onReview={openReviewPage}
        />

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