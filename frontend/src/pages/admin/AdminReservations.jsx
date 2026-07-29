import React, { useState, useEffect } from "react";
import { Download, Plus, Search, Filter, Eye, Check, Edit3, Printer, XCircle } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import ConflictModal from "../../components/admin/ui/ConflictModal";
import { useNavigate } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function AdminReservations() {
  const navigate = useNavigate();
  const { notify } = useToast();
  
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showConflict, setShowConflict] = useState(false);
  const [approvedId, setApprovedId] = useState(null);
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);

  const statuses = ["all", "pending deposit", "confirmed", "completed", "cancelled", "change requests"];

  const loadData = () => {
    setLoading(true);
    AdminAPI.getBookings()
      .then((res) => {
        setBookings(res.data);
      })
      .catch((err) => {
        notify("Failed to load bookings", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  // Map API fields to table columns
  const formattedBookings = bookings.map(b => {
    // Check if there is a pending change request
    const hasChangeRequest = b.change_request?.status === "pending";
    const mappedStatus = hasChangeRequest ? "change requests" : b.status;
    
    return {
      _id: b._id,
      id: b.reference || b._id.substring(b._id.length - 8).toUpperCase(),
      customer: b.customer_id?.full_name || `${b.contact_first_name} ${b.contact_last_name}`.trim() || "Unknown",
      email: b.customer_id?.email || b.contact_email || "",
      eventType: b.event_type || "Event",
      pkg: b.package_id?.name || "Custom",
      guests: b.guest_count || 0,
      date: b.event_date ? new Date(b.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA",
      venue: b.venue_type || "TBA",
      depositStatus: b.payment_status === "deposit_paid" || b.payment_status === "fully_paid" ? "Paid" : "Pending",
      finalPayment: b.payment_status === "fully_paid" ? "Paid" : "Pending",
      status: mappedStatus,
      rawStatus: b.status,
      coordinator: b.event_manager_id?.full_name || "—",
      total: b.total_price || 0,
    };
  });

  const filtered = formattedBookings.filter(r => {
    const matchStatus = filter === "all" || r.status === filter;
    const matchSearch = !search || r.customer.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleApprove = (id) => {
    // In a real app we might call an API to check availability first.
    // For now, we'll just confirm the booking manually if it has issues, or normally approve it.
    AdminAPI.updateBooking(id, { status: "confirmed" })
      .then(() => {
        setApprovedId(id);
        notify("Booking approved successfully.", "success");
        setTimeout(() => setApprovedId(null), 2000);
        loadData();
      })
      .catch(err => {
        if (err.response?.status === 409) {
          setShowConflict(true);
        } else {
          notify(err.response?.data?.message || "Failed to approve booking.", "error");
        }
      });
  };

  const handleCancel = (id) => {
    AdminAPI.updateBooking(id, { status: "cancelled" })
      .then(() => {
        notify("Booking cancelled successfully.", "success");
        setCancelTarget(null);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to cancel booking", "error"));
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        {showConflict && (
          <ConflictModal 
            onClose={() => setShowConflict(false)} 
            onApprove={() => { 
              setShowConflict(false); 
              // Usually the admin resolves the conflict manually in details
              notify("Please resolve the conflict in the booking details.", "warning");
            }} 
          />
        )}

        {cancelTarget && (
          <ConfirmDialog
            message={`Are you sure you want to cancel booking ${cancelTarget.id}?`}
            onConfirm={() => handleCancel(cancelTarget._id)}
            onCancel={() => setCancelTarget(null)}
          />
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Reservations</h2>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="secondary" size="sm"><Download size={13} /> Export</Btn>
            <Btn variant="gold" size="sm" onClick={() => navigate("/admin/bookings/new")}><Plus size={13} /> New Booking</Btn>
          </div>
        </div>

        {/* Filter bar */}
        <AdminCard className="!p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 min-w-48">
              <Search size={14} className="text-[#9CA3AF]" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search by ID or customer..." 
                className="bg-transparent text-sm focus:outline-none flex-1" 
                style={{ fontFamily: "Inter, sans-serif" }} 
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {statuses.map(s => (
                <button 
                  key={s} 
                  onClick={() => setFilter(s)} 
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${filter === s ? "bg-[#111827] text-white" : "bg-gray-100 text-[#6B7280] hover:bg-gray-200"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <Btn variant="secondary" size="sm"><Filter size={13} /> Date Range</Btn>
          </div>
        </AdminCard>

        {/* Table */}
        <AdminCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]" style={{ fontFamily: "Inter, sans-serif" }}>
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  {["Booking ID","Customer","Event Type","Package","Guests","Date","Venue","Deposit","Final Pay","Status","Coordinator","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="12" className="text-center py-8 text-gray-500">Loading bookings...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="12" className="text-center py-8 text-gray-500">No bookings found.</td></tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r._id} className={`hover:bg-gray-50 transition-colors ${approvedId === r._id ? "bg-emerald-50" : ""}`}>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-[#D4AF37]">{r.id}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-[#111]">{r.customer}</p>
                        <p className="text-xs text-[#9CA3AF]">{r.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#374151]">{r.eventType}</td>
                      <td className="px-4 py-3 text-xs text-[#374151]">{r.pkg}</td>
                      <td className="px-4 py-3 text-xs text-[#374151] text-center">{r.guests}</td>
                      <td className="px-4 py-3 text-xs text-[#374151] whitespace-nowrap">{r.date}</td>
                      <td className="px-4 py-3 text-xs text-[#374151] max-w-[130px] truncate">{r.venue}</td>
                      <td className="px-4 py-3"><Badge status={r.depositStatus} /></td>
                      <td className="px-4 py-3"><Badge status={r.finalPayment} /></td>
                      <td className="px-4 py-3"><Badge status={r.status} /></td>
                      <td className="px-4 py-3 text-xs text-[#374151]">{r.coordinator}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => navigate(`/admin/bookings/${r._id}/details`)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="View"><Eye size={13} /></button>
                          {(r.rawStatus === "pending deposit" || r.status === "change requests") && (
                            <button onClick={() => handleApprove(r._id)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500 transition-colors" title="Approve"><Check size={13} /></button>
                          )}
                          <button onClick={() => navigate(`/admin/bookings/${r._id}/details`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280] transition-colors" title="Edit"><Edit3 size={13} /></button>
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280] transition-colors" title="Print Invoice"><Printer size={13} /></button>
                          <button onClick={() => setCancelTarget(r)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors" title="Cancel"><XCircle size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-[#6B7280]">Showing {filtered.length} of {bookings.length} reservations</p>
          </div>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
