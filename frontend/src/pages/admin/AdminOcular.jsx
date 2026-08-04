import React, { useState, useEffect } from "react";
import { Search, Eye, Plus, AlertTriangle } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import { AdminAPI } from "../../api/admin";
import { useNavigate } from "react-router-dom";
import useToast from "../../hooks/useToast";
import { cn } from "@/lib/utils";

export default function AdminOcular() {
  const navigate = useNavigate();
  const { notify } = useToast();
  
  const [search, setSearch] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    AdminAPI.getBookings()
      .then(res => {
        const ocularBookings = res.data.filter(b => b.ocular_visit && b.ocular_visit.status);
        setBookings(ocularBookings);
      })
      .catch(err => {
        notify("Failed to load ocular visits", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const formattedOculars = bookings.map(b => {
    return {
      _id: b._id,
      id: b.reference || b._id.substring(b._id.length - 8).toUpperCase(),
      customer: b.customer_id?.full_name || `${b.contact_first_name} ${b.contact_last_name}`.trim(),
      coordinator: b.event_manager_id?.full_name || "—",
      date: b.ocular_visit?.scheduled_date ? new Date(b.ocular_visit.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'}) : "TBA",
      time: b.ocular_visit?.scheduled_time || "TBA",
      status: b.ocular_visit?.status || "pending",
      outcome: b.ocular_visit?.outcome || "—"
    };
  });

  const filtered = formattedOculars.filter(o => 
    !search || o.customer.toLowerCase().includes(search.toLowerCase()) || o.id.toLowerCase().includes(search.toLowerCase())
  );

  const handleCancel = (item) => {
    setCancelTarget(item);
    setShowCancelModal(true);
  };

  const confirmCancel = () => {
    AdminAPI.completeOcular(cancelTarget._id, { outcome: "cancel", notes: "Cancelled via Admin Ocular interface." })
      .then(() => {
        setShowCancelModal(false);
        setCancelTarget(null);
        notify("Ocular cancelled and booking status updated.", "warning");
        loadData();
      })
      .catch(err => {
        notify(err.response?.data?.message || "Failed to cancel ocular", "error");
      });
  };

  const handleProceed = (id) => {
    AdminAPI.completeOcular(id, { outcome: "proceed", notes: "Proceeding based on successful ocular visit." })
      .then(() => {
        notify("Ocular visit marked as completed (proceeding).", "success");
        loadData();
      })
      .catch(err => {
        notify(err.response?.data?.message || "Failed to complete ocular", "error");
      });
  };

  const StatusPill = ({ status }) => {
    if (status === 'completed') {
      return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold tracking-wide">Completed</span>;
    }
    if (status === 'scheduled') {
      return <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-semibold tracking-wide">Scheduled</span>;
    }
    return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold tracking-wide capitalize">{status}</span>;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-[#FAFAFA] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-3xl font-bold text-[#111]">Ocular Visit Management</h2>
          <button className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C5A028] text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
            <Plus size={16} />
            Schedule Visit
          </button>
        </div>

        <AdminCard className="!p-0 overflow-hidden shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 max-w-sm border border-gray-200 focus-within:border-[#D4AF37] focus-within:ring-1 focus-within:ring-[#D4AF37] transition-all">
              <Search size={16} className="text-[#9CA3AF]" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search by booking or customer..." 
                className="bg-transparent text-sm focus:outline-none flex-1 text-gray-700" 
                style={{ fontFamily: "Inter, sans-serif" }} 
              />
            </div>
          </div>
          <div className="overflow-x-auto bg-white">
            <table className="w-full min-w-[900px]" style={{ fontFamily: "Inter, sans-serif" }}>
              <thead className="bg-[#F9FAFB] border-b border-gray-100">
                <tr>
                  {["CUSTOMER", "RESERVATION", "COORDINATOR", "DATE", "TIME", "STATUS", "OUTCOME", "ACTIONS"].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="8" className="text-center py-12 text-gray-500">Loading ocular visits...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="8" className="text-center py-12 text-gray-500">No ocular visits found.</td></tr>
                ) : (
                  filtered.map(o => (
                    <tr key={o._id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-4">
                        <div className="text-sm font-bold text-[#111]">{o.customer}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-[#D4AF37] tracking-wide cursor-pointer hover:underline" onClick={() => navigate(`/admin/bookings/${o._id}/details`)}>
                          {o.id}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#4B5563]">{o.coordinator}</td>
                      <td className="px-5 py-4 text-sm text-[#4B5563]">{o.date}</td>
                      <td className="px-5 py-4 text-sm text-[#4B5563]">{o.time}</td>
                      <td className="px-5 py-4"><StatusPill status={o.status} /></td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-[#4B5563] capitalize">{o.outcome === "proceed" ? "Proceed" : o.outcome}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {o.status === "scheduled" || o.status === "requested" ? (
                            <>
                              <button onClick={() => handleProceed(o._id)} className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#C5A028] text-white text-xs font-semibold rounded-full transition-colors shadow-sm">
                                Proceed
                              </button>
                              <button onClick={() => navigate(`/admin/bookings/${o._id}/details`)} className="px-4 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-full transition-colors">
                                Revise
                              </button>
                              <button onClick={() => handleCancel(o)} className="px-4 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold rounded-full transition-colors shadow-sm">
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button onClick={() => navigate(`/admin/bookings/${o._id}/details`)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                              <Eye size={14} />
                              View
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      {showCancelModal && cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-red-50/50">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Cancel Ocular Visit</h3>
                <p className="text-xs text-red-600 font-medium">Booking {cancelTarget.id}</p>
              </div>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-gray-600 mb-2 leading-relaxed">
                Are you sure you want to cancel the ocular visit for <strong className="text-gray-900">{cancelTarget.customer}</strong>? 
              </p>
              <p className="text-sm text-gray-500 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                This action will mark the booking as cancelled and prepare it for a refund. This cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-gray-50">
              <button 
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setShowCancelModal(false)}
              >
                Keep Scheduled
              </button>
              <button 
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                onClick={confirmCancel}
              >
                Cancel & Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
