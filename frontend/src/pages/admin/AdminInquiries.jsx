import { useEffect, useState } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminInquiriesTable from "../../components/tables/AdminInquiriesTable";
import useToast from "../../hooks/useToast";

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { notify } = useToast();
  const navigate = useNavigate();

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
    AdminAPI.updateInquiry(id, { status })
      .then(() => {
        notify(`Inquiry ${status}.`, "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to update inquiry.", "error"));
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
          <p>Convert paid inquiries into active bookings</p>
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
          <option value="quoted">Quoted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="admin-table-wrap">
        <AdminInquiriesTable
          inquiries={filtered}
          onSelect={(inq) => setSelected(inq)}
          onQuote={openQuotePage}
          onConvert={openQuotePage}
          onApprove={(inq) => updateStatus(inq._id, "approved")}
          onReject={(inq) => updateStatus(inq._id, "rejected")}
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