import React, { useState, useEffect } from "react";
import { Search, Download, FileText, Check } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { useNavigate } from "react-router-dom";
import { AdminAPI } from "../../api/admin";

export default function AdminPayments() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AdminAPI.getPayments()
      .then(res => {
        setPayments(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getCustomerName = (p) => {
    if (p.customer_id?.full_name) return p.customer_id.full_name;
    if (p.booking_id?.contact_first_name) return `${p.booking_id.contact_first_name} ${p.booking_id.contact_last_name || ''}`.trim();
    return "Unknown";
  };

  const filtered = payments.filter(p => {
    const custName = getCustomerName(p).toLowerCase();
    const ref = (p.booking_id?.reference || "").toLowerCase();
    const q = search.toLowerCase();
    return !search || custName.includes(q) || ref.includes(q);
  });

  const fmt = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 0 });
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };
  const getStatusBadge = (status) => {
    const s = String(status).toLowerCase();
    if (s === "approved" || s === "paid" || s === "succeeded") return "Paid";
    if (s === "pending") return "Pending";
    if (s === "rejected" || s === "failed") return "Failed";
    return "Pending";
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Payments</h2>
          <Btn variant="secondary" size="sm"><Download size={13} /> Export Report</Btn>
        </div>

        <AdminCard className="!p-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 max-w-sm">
            <Search size={14} className="text-[#9CA3AF]" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search payments..." 
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
                  {["Payment ID","Booking","Customer","Method","Amount","Date","Status","Invoice","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-gray-500 text-sm">Loading payments...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-gray-500 text-sm">No payments found.</td>
                  </tr>
                ) : (
                  filtered.map(p => {
                    const payId = `PAY-${p._id.slice(-6).toUpperCase()}`;
                    const bookingRef = p.booking_id?.reference || "—";
                    const method = p.method === "paymongo" ? "Online" : (p.method || "—");
                    const date = p.paid_at ? formatDate(p.paid_at) : formatDate(p.createdAt);
                    const statusStr = getStatusBadge(p.status);

                    return (
                      <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono font-bold text-[#111]">{payId}</td>
                        <td className="px-4 py-3 text-xs font-mono font-bold text-[#D4AF37] cursor-pointer hover:underline" onClick={() => p.booking_id?.reference && navigate(`/admin/bookings/${p.booking_id.reference}/details`)}>
                          {bookingRef}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#D4AF37] cursor-pointer hover:underline" onClick={() => navigate('/admin/customers')}>
                          {getCustomerName(p)}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#374151] capitalize">{method}</td>
                        <td className="px-4 py-3 text-sm font-bold text-emerald-600">{fmt(p.amount)}</td>
                        <td className="px-4 py-3 text-xs text-[#374151]">{date}</td>
                        <td className="px-4 py-3"><Badge status={statusStr} /></td>
                        <td className="px-4 py-3 text-xs font-mono text-[#374151] hover:text-[#D4AF37] cursor-pointer hover:underline">
                          —
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]" title="View Details"><FileText size={13} /></button>
                            {statusStr === "Pending" && (
                              <button className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500" title="Verify Payment"><Check size={13} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}