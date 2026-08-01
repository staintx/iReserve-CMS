import React, { useState, useEffect } from "react";
import { Search, Download, Calculator, Check, XCircle, AlertTriangle } from "lucide-react";
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
                {loading ? (
                  <tr><td colSpan="9" className="text-center py-8 text-gray-500">Loading refunds...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="9" className="text-center py-8 text-gray-500">No refunds found.</td></tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono font-bold text-[#111]">REF-{r.id.substring(4)}</td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-[#D4AF37] cursor-pointer hover:underline" onClick={() => navigate(`/admin/bookings/${r._id}/details`)}>{r.booking}</td>
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
                            <button className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]" title="View details" onClick={() => navigate(`/admin/bookings/${r._id}/details`)}><Search size={13} /></button>
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
