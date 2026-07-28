import React, { useState } from "react";
import { Search, Download, Calculator, Check, XCircle, AlertTriangle } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { REFUNDS_DATA } from "../../components/admin/ui/data";
import { useNavigate } from "react-router-dom";

export default function AdminRefunds() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [activeRefund, setActiveRefund] = useState(null);
  const [calcPct, setCalcPct] = useState(50); // Default to 50% as example

  const filtered = REFUNDS_DATA.filter(r => 
    !search || r.customer.toLowerCase().includes(search.toLowerCase()) || r.booking.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  const handleOpenCalc = (refund) => {
    setActiveRefund(refund);
    // Parse percentage or default to 50
    const pct = parseInt(refund.pct.replace("%", "")) || 50;
    setCalcPct(pct);
    setShowCalcModal(true);
  };

  const handleApprove = () => {
    // Save calculated refund and approve
    setShowCalcModal(false);
    setActiveRefund(null);
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Refunds & Cancellations</h2>
          <Btn variant="secondary" size="sm"><Download size={13} /> Export Report</Btn>
        </div>

        <AdminCard className="!p-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 max-w-sm">
            <Search size={14} className="text-[#9CA3AF]" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search refunds..." 
              className="bg-transparent text-sm focus:outline-none flex-1" 
              style={{ fontFamily: "Inter, sans-serif" }} 
            />
          </div>
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]" style={{ fontFamily: "Inter, sans-serif" }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Refund ID","Booking","Customer","Reason","Deposit Paid","Refund %","Amount Due","Status","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono font-bold text-[#111]">{r.id}</td>
                    <td className="px-4 py-3 text-xs font-mono font-bold text-[#D4AF37] cursor-pointer hover:underline" onClick={() => navigate(`/admin/bookings/${r.booking}/details`)}>{r.booking}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#111]">{r.customer}</td>
                    <td className="px-4 py-3 text-xs text-[#374151] max-w-[200px] truncate" title={r.reason}>{r.reason}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#374151]">{fmt(r.deposit)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#111]">{r.pct}</td>
                    <td className="px-4 py-3 text-sm font-bold text-orange-600">{fmt(r.amount)}</td>
                    <td className="px-4 py-3"><Badge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {r.status === "pending" && (
                          <>
                            <button onClick={() => handleOpenCalc(r)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="Calculate & Approve"><Calculator size={13} /></button>
                            <button className="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="Reject"><XCircle size={13} /></button>
                          </>
                        )}
                        {r.status !== "pending" && (
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]" title="View details"><Search size={13} /></button>
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

      {showCalcModal && activeRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
              <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center"><Calculator size={20} className="text-[#D4AF37]" /></div>
              <div>
                <p className="font-bold text-[#111]">Calculate Refund</p>
                <p className="text-xs text-[#6B7280]">Booking {activeRefund.booking}</p>
              </div>
            </div>
            
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Deposit Paid</span>
                  <span className="font-semibold text-[#111]">{fmt(activeRefund.deposit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Reason</span>
                  <span className="font-semibold text-[#111] text-right max-w-[200px]">{activeRefund.reason}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Refund Percentage</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="10" 
                    value={calcPct} 
                    onChange={(e) => setCalcPct(parseInt(e.target.value))}
                    className="flex-1 accent-[#D4AF37]"
                  />
                  <span className="font-bold text-[#111] w-12 text-right">{calcPct}%</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#111]">Amount to Refund</span>
                  <span className="text-2xl font-bold text-[#D4AF37]">{fmt((activeRefund.deposit * calcPct) / 100)}</span>
                </div>
                {calcPct < 100 && (
                  <p className="text-xs text-orange-500 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> {100 - calcPct}% cancellation fee applied</p>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
              <Btn variant="secondary" size="sm" onClick={() => setShowCalcModal(false)}>Cancel</Btn>
              <Btn variant="gold" size="sm" onClick={handleApprove}>Approve Refund</Btn>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
