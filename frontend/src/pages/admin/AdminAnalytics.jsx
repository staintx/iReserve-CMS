import React, { useState } from "react";
import { Download, Filter, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import { REVENUE_DATA, BOOKINGS_DATA } from "../../components/admin/ui/data";

export default function AdminAnalytics() {
  const [range, setRange] = useState("This Year");

  const fmt = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Analytics & Reports</h2>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5 shadow-sm">
              <Calendar size={13} className="text-[#6B7280]" />
              <select 
                value={range} 
                onChange={(e) => setRange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#111] focus:outline-none"
              >
                <option>This Year</option>
                <option>Last 6 Months</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            <Btn variant="secondary" size="sm"><Download size={13} /> Export Data</Btn>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Revenue Overview */}
          <AdminCard className="!p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-[#111]">Revenue Overview</p>
                <p className="text-xs text-[#6B7280]">Monthly revenue vs expenses</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} fill="#D4AF37" fillOpacity={0.12} />
                <Area type="monotone" dataKey="expenses" stroke="#E5E7EB" strokeWidth={2} fill="#F9FAFB" fillOpacity={0.5} />
              </AreaChart>
            </ResponsiveContainer>
          </AdminCard>

          {/* Bookings Volume */}
          <AdminCard className="!p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-[#111]">Bookings Volume</p>
                <p className="text-xs text-[#6B7280]">Daily bookings received</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={BOOKINGS_DATA} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="bookings" fill="#111827" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </AdminCard>
        </div>
      </div>
    </AdminLayout>
  );
}
