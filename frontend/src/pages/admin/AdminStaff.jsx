import React, { useState } from "react";
import { Search, Plus, Filter, Edit3, Trash2, Calendar, Star } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { STAFF_DATA } from "../../components/admin/ui/data";

export default function AdminStaff() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const roles = ["all", "Head Chef", "Event Coordinator", "Service Captain", "Pastry Chef", "Sous Chef", "Event Server", "Driver / Delivery"];

  const filtered = STAFF_DATA.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchRole = filter === "all" || s.role === filter;
    return matchSearch && matchRole;
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Staff Management</h2>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="secondary" size="sm"><Calendar size={13} /> View Schedule</Btn>
            <Btn variant="gold" size="sm"><Plus size={13} /> Add Staff</Btn>
          </div>
        </div>

        <AdminCard className="!p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 min-w-48">
              <Search size={14} className="text-[#9CA3AF]" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search staff..." 
                className="bg-transparent text-sm focus:outline-none flex-1" 
                style={{ fontFamily: "Inter, sans-serif" }} 
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              <select 
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="bg-gray-100 text-[#6B7280] text-xs font-semibold px-3 py-1.5 rounded-xl border-none focus:ring-0 outline-none capitalize"
              >
                {roles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <Btn variant="secondary" size="sm"><Filter size={13} /> Filters</Btn>
          </div>
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]" style={{ fontFamily: "Inter, sans-serif" }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Staff Member","Role","Contact","Events Handled","Rating","Certifications","Status","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-xs font-bold text-[#374151]">
                          {s.avatar}
                        </div>
                        <span className="text-sm font-semibold text-[#111]">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{s.role}</td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{s.phone}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#111] text-center">{s.events}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs font-semibold text-[#111]">
                        {s.rating} <Star size={11} className="text-[#D4AF37] fill-[#D4AF37]" />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#6B7280] max-w-[150px] truncate">{s.cert}</td>
                    <td className="px-4 py-3"><Badge status={s.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]"><Edit3 size={13} /></button>
                        <button className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={13} /></button>
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