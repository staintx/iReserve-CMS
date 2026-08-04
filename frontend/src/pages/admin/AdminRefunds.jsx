import React, { useState, useEffect } from "react";
import { Search, Download, Calculator, Check, XCircle, AlertTriangle, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import { useNavigate } from "react-router-dom";
import useToast from "../../hooks/useToast";

export default function AdminRefunds() {
  const navigate = useNavigate();
  const { notify } = useToast();
  
  const [search, setSearch] = useState("");
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [activeRefund, setActiveRefund] = useState(null);
  const [calcPct, setCalcPct] = useState(50); // Default to 50% as example
  const [refundReason, setRefundReason] = useState("");
  
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      AdminAPI.getBookings(),
      AdminAPI.getPayments()
    ]).then(([bRes, pRes]) => {
      // Find cancelled bookings that might have payments
      const allPayments = pRes.data;
      setPayments(allPayments);
      
      const cancelled = bRes.data.filter(b => 
        b.status === "cancelled" || b.status === "refunded"
      );
      
      const refundsData = cancelled.map(b => {
        const bPayments = allPayments.filter(p => p.booking_id?._id === b._id || p.booking_id === b._id);
        const totalPaid = bPayments.filter(p => p.status === "approved").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        
        return {
          _id: b._id,
          id: b.reference || b._id.substring(b._id.length - 8).toUpperCase(),
          customer: b.customer_id?.full_name || `${b.contact_first_name} ${b.contact_last_name}`.trim(),
          booking: b.reference || b._id.substring(b._id.length - 8).toUpperCase(),
          reason: b.cancellation_reason || (b.ocular_visit?.outcome === "cancel" ? "Ocular cancelled" : "Cancelled by admin/customer"),
          deposit: totalPaid,
          pct: b.status === "refunded" ? "100%" : "—",
          amount: b.status === "refunded" ? totalPaid : 0, // In a real app we'd have a refund schema
          status: b.status === "refunded" ? "approved" : (totalPaid > 0 ? "pending" : "no_refund_needed")
        };
      });
      
      // Only show refunds where a deposit was actually paid, or it was already refunded
      setRefunds(refundsData.filter(r => r.deposit > 0 || r.status === "approved"));
    }).catch(err => {
      notify("Failed to load refunds", "error");
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = refunds.filter(r => 
    !search || r.customer.toLowerCase().includes(search.toLowerCase()) || r.booking.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  const handleOpenCalc = (refund) => {
    setActiveRefund(refund);
    // Parse percentage or default to 50
    const pct = parseInt(refund.pct.replace("%", "")) || 50;
    setCalcPct(pct);
    setRefundReason(refund.reason);
    setShowCalcModal(true);
  };

  const handleApprove = () => {
    const refundAmount = (activeRefund.deposit * calcPct) / 100;
    AdminAPI.processRefund(activeRefund._id, { amount: refundAmount, reason: refundReason })
      .then(() => {
        // Also mark the booking as refunded
        return AdminAPI.updateBooking(activeRefund._id, { status: "refunded" });
      })
      .then(() => {
        notify(`Refund of ${fmt(refundAmount)} processed successfully.`, "success");
        setShowCalcModal(false);
        setActiveRefund(null);
        loadData();
      })
      .catch(err => {
        notify(err.response?.data?.message || "Failed to process refund", "error");
      });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center text-sm font-medium text-[#6B7280]">
            <ChevronLeft size={16} className="mr-1" />
            <span className="cursor-pointer hover:text-[#111]">Finance</span>
            <ChevronRight size={14} className="mx-2 text-gray-300" />
            <span className="text-[#111] font-bold">Refund Queue</span>
          </div>
        </div>

        <AdminCard className="!p-0 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-[#111] text-lg">Refund Requests</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]" style={{ fontFamily: "Inter, sans-serif" }}>
              <thead className="bg-[#F9FAFB] border-b border-gray-100">
                <tr>
                  {["REF ID", "CUSTOMER", "BOOKING", "DEPOSIT PAID", "REFUND %", "REFUND AMOUNT", "REASON", "STATUS", "ACTIONS"].map(h => (
                    <th key={h} className="px-6 py-4 text-left text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {loading ? (
                  <tr><td colSpan="9" className="text-center py-8 text-gray-500">Loading refunds...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-8 text-gray-500">No refunds found.</td></tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-[#D4AF37]">REF-{r.id.substring(r.id.length - 3)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-[#111]">{r.customer}</td>
                      <td className="px-6 py-4 text-xs font-mono text-[#6B7280]">
                        {r.booking.includes('-') ? (
                          <div className="leading-tight">
                            {r.booking.split('-')[0]}-<br/>{r.booking.split('-')[1]}
                          </div>
                        ) : r.booking}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#111]">{fmt(r.deposit)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-[#111]">{r.pct}</td>
                      <td className="px-6 py-4 text-sm font-bold text-[#EF4444]">{r.amount === 0 ? "₱0" : fmt(r.amount)}</td>
                      <td className="px-6 py-4 text-xs text-[#6B7280] max-w-[150px] leading-relaxed">{r.reason}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          r.status === "pending" ? "bg-[#FFF9E6] text-[#D4AF37]" :
                          r.status === "approved" ? "bg-[#E6F4EA] text-[#1E8E3E]" :
                          r.status === "rejected" ? "bg-[#FCE8E8] text-[#EF4444]" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1).replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {r.status === "pending" && (
                            <div className="flex flex-col gap-1.5">
                              <button onClick={() => handleOpenCalc(r)} className="px-3 py-1 bg-[#D4AF37] hover:bg-[#B8972E] text-[#111] text-xs font-bold rounded-full transition-colors whitespace-nowrap">Approve</button>
                              <button className="px-3 py-1 bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold rounded-full transition-colors whitespace-nowrap">Reject</button>
                            </div>
                          )}
                          {r.status === "approved" && (
                            <button className="px-4 py-1.5 bg-[#111827] hover:bg-black text-white text-xs font-bold rounded-full transition-colors whitespace-nowrap">Mark Completed</button>
                          )}
                          <button className="text-[#9CA3AF] hover:text-[#111] transition-colors p-1" title="View document" onClick={() => navigate(`/admin/bookings/${r._id}/details`)}>
                            <FileText size={16} />
                          </button>
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
