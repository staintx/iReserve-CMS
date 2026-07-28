import React, { useState } from "react";
import { Search, Eye, Check, Calendar, XCircle, AlertTriangle } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { OCULAR_DATA } from "../../components/admin/ui/data";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/common/Modal";

export default function AdminOcular() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const filtered = OCULAR_DATA.filter(o => 
    !search || o.customer.toLowerCase().includes(search.toLowerCase()) || o.booking.toLowerCase().includes(search.toLowerCase())
  );

  const handleCancel = (item) => {
    setCancelTarget(item);
    setShowCancelModal(true);
  };

  const confirmCancel = () => {
    // In a real app, this would call an API to cancel the ocular visit and generate a refund request.
    // For this prototype, we simulate the action.
    setShowCancelModal(false);
    setCancelTarget(null);
    // You could optionally show a toast notification here
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Ocular Visits</h2>
        </div>

        <AdminCard className="!p-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 max-w-sm">
            <Search size={14} className="text-[#9CA3AF]" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search by booking or customer..." 
              className="bg-transparent text-sm focus:outline-none flex-1" 
              style={{ fontFamily: "Inter, sans-serif" }} 
            />
          </div>
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]" style={{ fontFamily: "Inter, sans-serif" }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Booking ID","Customer","Coordinator","Date","Time","Status","Outcome","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono font-bold text-[#D4AF37] cursor-pointer hover:underline" onClick={() => navigate(`/admin/bookings/${o.booking}/details`)}>
                      {o.booking}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#111]">{o.customer}</td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{o.coordinator}</td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{o.date}</td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{o.time}</td>
                    <td className="px-4 py-3"><Badge status={o.status} /></td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{o.outcome}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {o.status === "scheduled" && (
                          <>
                            <button className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500 transition-colors" title="Mark Completed"><Check size={13} /></button>
                            <button className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="Reschedule"><Calendar size={13} /></button>
                            <button onClick={() => handleCancel(o)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors" title="Cancel & Refund"><XCircle size={13} /></button>
                          </>
                        )}
                        {o.status === "completed" && (
                          <button onClick={() => navigate(`/admin/bookings/${o.booking}/details`)} className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280] transition-colors" title="View Booking"><Eye size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      {showCancelModal && cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center"><AlertTriangle size={20} className="text-red-600" /></div>
              <div>
                <p className="font-bold text-[#111]">Cancel Ocular Visit</p>
                <p className="text-xs text-[#6B7280]">Booking {cancelTarget.booking}</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-[#374151] mb-4">
                Are you sure you want to cancel the ocular visit for <strong>{cancelTarget.customer}</strong>? 
                This action will automatically generate a pending refund request for their deposit since the venue is deemed unsuitable or the customer backed out during this stage.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
              <Btn variant="secondary" size="sm" onClick={() => setShowCancelModal(false)}>Keep Scheduled</Btn>
              <Btn variant="danger" size="sm" onClick={confirmCancel}>Cancel & Generate Refund</Btn>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
