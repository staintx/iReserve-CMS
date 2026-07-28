import React, { useState } from "react";
import { Search, Plus, Filter, Edit3, Trash2 } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { INVENTORY_DATA } from "../../components/admin/ui/data";

export default function AdminInventory() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const categories = ["all", "Equipment", "Furniture", "Tableware", "Decorations"];

  const filtered = INVENTORY_DATA.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filter === "all" || i.category === filter;
    return matchSearch && matchCategory;
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Inventory Management</h2>
          <Btn variant="gold" size="sm"><Plus size={13} /> Add Item</Btn>
        </div>

        <AdminCard className="!p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 min-w-48">
              <Search size={14} className="text-[#9CA3AF]" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search inventory..." 
                className="bg-transparent text-sm focus:outline-none flex-1" 
                style={{ fontFamily: "Inter, sans-serif" }} 
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {categories.map(c => (
                <button 
                  key={c} 
                  onClick={() => setFilter(c)} 
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${filter === c ? "bg-[#111827] text-white" : "bg-gray-100 text-[#6B7280] hover:bg-gray-200"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <Btn variant="secondary" size="sm"><Filter size={13} /> Filters</Btn>
          </div>
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]" style={{ fontFamily: "Inter, sans-serif" }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Item Name","Category","Total Stock","Reserved","Available","Min Stock","Supplier","Status","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-[#111]">{item.name}</td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{item.category}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#111] text-center">{item.stock}</td>
                    <td className="px-4 py-3 text-xs text-orange-600 font-semibold text-center">{item.reserved}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600 text-center">{item.available}</td>
                    <td className="px-4 py-3 text-xs text-[#6B7280] text-center">{item.minStock}</td>
                    <td className="px-4 py-3 text-xs text-[#374151]">{item.supplier}</td>
                    <td className="px-4 py-3"><Badge status={item.status} /></td>
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