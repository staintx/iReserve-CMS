import React, { useState } from "react";
import { Search, Download, Filter } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import { ACTIVITY_FEED } from "../../components/admin/ui/data";

export default function AdminAuditLogs() {
  const [search, setSearch] = useState("");

  const filtered = ACTIVITY_FEED.filter(a => 
    !search || a.msg.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Audit Logs</h2>
          <Btn variant="secondary" size="sm"><Download size={13} /> Export Logs</Btn>
        </div>

        <AdminCard className="!p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 min-w-48">
              <Search size={14} className="text-[#9CA3AF]" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search audit logs..." 
                className="bg-transparent text-sm focus:outline-none flex-1" 
                style={{ fontFamily: "Inter, sans-serif" }} 
              />
            </div>
            <Btn variant="secondary" size="sm"><Filter size={13} /> Filter Date</Btn>
          </div>
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]" style={{ fontFamily: "Inter, sans-serif" }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Timestamp","Action","User","IP Address"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">{log.time}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${log.color}`}>
                          {log.icon}
                        </div>
                        <span className="text-sm font-medium text-[#111]">{log.msg}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#374151] font-semibold">System Admin</td>
                    <td className="px-4 py-3 text-xs font-mono text-[#9CA3AF]">192.168.1.104</td>
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
