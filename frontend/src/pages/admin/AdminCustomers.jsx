import React, { useState } from "react";
import { Search, Eye, Edit3, Mail, Star } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Badge from "../../components/admin/ui/Badge";
import { CUSTOMERS_DATA } from "../../components/admin/ui/data";

export default function AdminCustomers() {
  const [search, setSearch] = useState("");
  const filtered = CUSTOMERS_DATA.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));

  const fmt = (n) => "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });

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
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-xs font-bold text-[#D4AF37]">
                        {c.name.split(" ").map(n=>n[0]).join("")}
                      </div>
                      <span className="text-sm font-semibold text-[#111]">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#374151]">{c.phone}</td>
                  <td className="px-4 py-3 text-xs text-[#374151]">{c.email}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[#111]">{fmt(c.spending)}</td>
                  <td className="px-4 py-3 text-xs text-center text-[#374151]">{c.reservations}</td>
                  <td className="px-4 py-3 text-xs text-[#374151]">{c.lastBooking}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-0.5">
                      {Array(5).fill(null).map((_, i) => (
                        <Star key={i} size={11} className={i < c.rating ? "text-[#D4AF37] fill-[#D4AF37]" : "text-gray-200 fill-gray-200"} />
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500"><Eye size={13} /></button>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]"><Edit3 size={13} /></button>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]"><Mail size={13} /></button>
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
