import React, { useState, useEffect } from "react";
import { Search, Eye, Edit3, Mail, Star } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";

export default function AdminCustomers() {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AdminAPI.getCustomers()
      .then((res) => setCustomers(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify("Failed to load customers", "error"))
      .finally(() => setLoading(false));
  }, [notify]);

  const filtered = customers.filter(c => !search || (c.full_name || "").toLowerCase().includes(search.toLowerCase()));

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });
  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Customers</h2>
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <Search size={14} className="text-[#9CA3AF]" />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search customers..." 
              className="bg-transparent text-sm focus:outline-none" 
              style={{ fontFamily: "Inter, sans-serif" }} 
            />
          </div>
        </div>
        
        <AdminCard className="!p-0 overflow-hidden">
          <table className="w-full" style={{ fontFamily: "Inter, sans-serif" }}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Customer","Phone","Email","Lifetime Spending","Reservations","Last Booking","Rating","Status","Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="9" className="p-8 text-center text-gray-500 text-sm">Loading customers...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="9" className="p-8 text-center text-gray-500 text-sm">No customers found.</td></tr>
              ) : filtered.map(c => (
                <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-xs font-bold text-[#D4AF37]">
                        {(c.full_name || "?").split(" ").map(n=>n[0]).join("")}
                      </div>
                      <span className="text-sm font-semibold text-[#111]">{c.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#374151]">{c.phone || "—"}</td>
                  <td className="px-4 py-3 text-xs text-[#374151]">{c.email}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[#111]">{fmt(c.spending)}</td>
                  <td className="px-4 py-3 text-xs text-center text-[#374151]">{c.reservations}</td>
                  <td className="px-4 py-3 text-xs text-[#374151]">{formatDate(c.last_booking_date)}</td>
                  <td className="px-4 py-3">
                    {c.rating ? (
                      <div className="flex items-center gap-0.5">
                        {Array(5).fill(null).map((_, i) => (
                          <Star key={i} size={11} className={i < c.rating ? "text-[#D4AF37] fill-[#D4AF37]" : "text-gray-200 fill-gray-200"} />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><Badge status={c.tier} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500"><Eye size={13} /></button>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]"><Edit3 size={13} /></button>
                      <a href={c.email ? `mailto:${c.email}` : undefined} className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]"><Mail size={13} /></a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminCard>
      </div>
    </AdminLayout>
  );
}
