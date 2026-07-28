import React, { useState } from "react";
import { Download, Plus, Search, Filter, Eye, Check, Edit3, Printer, XCircle } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import ConflictModal from "../../components/admin/ui/ConflictModal";
import { useNavigate } from "react-router-dom";
import { RESERVATIONS_DATA } from "../../components/admin/ui/data";

export default function AdminReservations() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showConflict, setShowConflict] = useState(false);
  const [approvedId, setApprovedId] = useState(null);

  // Added "change requests" to statuses to handle Admin Reviews of Customer Changes
  const statuses = ["all", "pending", "confirmed", "completed", "cancelled", "change requests"];

  // Inject a mock change request into RESERVATIONS_DATA for demonstration
  const dataWithChanges = [
    ...RESERVATIONS_DATA,
    { id: "CRS-CHG99", customer: "Liam Santos", phone: "+63 917 111 2222", email: "liam@email.com", eventType: "Corporate Gala", pkg: "Custom", guests: 150, date: "Aug 15, 2025", venue: "Shangri-La BGC", depositStatus: "Paid", finalPayment: "Pending", status: "change requests", coordinator: "—", total: 200000, deposit: 60000 }
  ];

  const filtered = dataWithChanges.filter(r => {
    const matchStatus = filter === "all" || r.status === filter;
    const matchSearch = !search || r.customer.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleApprove = (id) => {
    // Simulate the System Checks Availability step from the flowchart
    // By surfacing a conflict randomly or based on a specific ID
    if (id === "CRS-AB3Z9Q" || id === "CRS-CHG99") { 
      setShowConflict(true); 
      return; 
    }
    setApprovedId(id);
    setTimeout(() => setApprovedId(null), 2000);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        {showConflict && (
          <ConflictModal 
            onClose={() => setShowConflict(false)} 
            onApprove={() => { 
              setShowConflict(false); 
              setApprovedId("CRS-AB3Z9Q"); 
              setTimeout(() => setApprovedId(null), 2000); 
            }} 
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
                {filtered.map(r => (
                  <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${approvedId === r.id ? "bg-emerald-50" : ""}`}>
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
                        <button onClick={() => navigate(`/admin/bookings/${r.id}/details`)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors" title="View"><Eye size={13} /></button>
                        {(r.status === "pending" || r.status === "change requests") && (
                          <button onClick={() => handleApprove(r.id)} className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500 transition-colors" title="Approve"><Check size={13} /></button>
                        )}
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280] transition-colors" title="Edit"><Edit3 size={13} /></button>
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280] transition-colors" title="Print Invoice"><Printer size={13} /></button>
                        <button className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors" title="Cancel"><XCircle size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-[#6B7280]">Showing {filtered.length} of {dataWithChanges.length} reservations</p>
            <div className="flex gap-1">
              {[1].map(p => <button key={p} className={`w-7 h-7 rounded-lg text-xs font-semibold ${p===1?"bg-[#111827] text-white":"text-[#6B7280] hover:bg-gray-200"}`}>{p}</button>)}
            </div>
          </div>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
