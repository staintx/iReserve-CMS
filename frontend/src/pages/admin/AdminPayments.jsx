import React, { useState } from "react";
import { Search, Download, FileText, Check } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { PAYMENTS_DATA } from "../../components/admin/ui/data";
import { useNavigate } from "react-router-dom";

export default function AdminPayments() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = PAYMENTS_DATA.filter(p => 
    !search || p.customer.toLowerCase().includes(search.toLowerCase()) || p.booking.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 0 });

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
                  {["Payment ID","Booking","Customer","Method","Amount","Date","PayMongo","Invoice","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono font-bold text-[#111]">{p.id}</td>
                    <td className="px-4 py-3 text-xs font-mono font-bold text-[#D4AF37] cursor-pointer hover:underline" onClick={() => navigate(`/admin/bookings/${p.booking}/details`)}>{p.booking}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#111]">{p.customer}</td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{p.method}</td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600">{fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{p.date}</td>
                    <td className="px-4 py-3"><Badge status={p.paymongo} /></td>
                    <td className="px-4 py-3 text-xs font-mono text-[#374151] hover:text-[#D4AF37] cursor-pointer hover:underline">{p.invoice}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]" title="View Invoice"><FileText size={13} /></button>
                        {p.paymongo === "Pending" && (
                          <button className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500" title="Verify Payment"><Check size={13} /></button>
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
    </AdminLayout>
  );
}