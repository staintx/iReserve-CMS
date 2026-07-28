import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";

export default function AdminCalendar() {
  const [view, setView] = useState("month");
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  
  const events = {
    2: [{ label: "Sofia Wedding", color: "bg-emerald-500" }],
    8: [{ label: "Corporate Event", color: "bg-blue-500" }],
    15: [{ label: "Debut Party", color: "bg-purple-500" }],
    18: [{ label: "Synergy Gala", color: "bg-[#D4AF37]" }],
    20: [{ label: "Lim Launch", color: "bg-red-400" }],
    22: [{ label: "Ocular Visit", color: "bg-cyan-500" }],
    25: [{ label: "Ocular Visit", color: "bg-cyan-500" }, { label: "Santos Wedding", color: "bg-emerald-500" }],
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Availability Calendar</h2>
          <div className="flex gap-2">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {["month", "week", "agenda"].map(v => (
                <button 
                  key={v} 
                  onClick={() => setView(v)} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${view === v ? "bg-white text-[#111] shadow-sm" : "text-[#6B7280]"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <Btn variant="gold" size="sm"><Plus size={13} /> Block Date</Btn>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-3">
            <AdminCard className="!p-5">
              <div className="flex items-center justify-between mb-5">
                <button className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16} /></button>
                <p className="font-bold text-[#111]">August 2025</p>
                <button className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={16} /></button>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-[#9CA3AF] py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array(4).fill(null).map((_, i) => <div key={i} />)}
                {Array(31).fill(null).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = events[day] || [];
                  return (
                    <div key={day} className={`min-h-[72px] p-1.5 rounded-xl border transition-colors cursor-pointer ${day === 22 ? "border-[#D4AF37] bg-[#D4AF37]/05" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}>
                      <p className={`text-xs font-semibold mb-1 ${day === 22 ? "text-[#D4AF37]" : "text-[#374151]"}`}>{day}</p>
                      {dayEvents.map((e, ei) => (
                        <div key={ei} className={`${e.color} text-white text-[9px] font-medium px-1.5 py-0.5 rounded-md mb-0.5 truncate`}>{e.label}</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </AdminCard>
          </div>

          <div className="space-y-4">
            <AdminCard className="!p-4">
              <p className="font-bold text-[#111] text-sm mb-3">Legend</p>
              {[
                ["bg-emerald-500", "Confirmed Events"],
                ["bg-[#D4AF37]", "Gold Package"],
                ["bg-blue-500", "Corporate"],
                ["bg-purple-500", "Birthday/Debut"],
                ["bg-cyan-500", "Ocular Visit"],
                ["bg-red-400", "Launch/Other"],
                ["bg-gray-300", "Blocked / Holiday"]
              ].map(([c, l]) => (
                <div key={l} className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-sm ${c} flex-shrink-0`} />
                  <p className="text-xs text-[#6B7280]">{l}</p>
                </div>
              ))}
            </AdminCard>
            <AdminCard className="!p-4">
              <p className="font-bold text-[#111] text-sm mb-3">Today — Aug 22</p>
              <div className="space-y-2">
                <div className="p-2.5 bg-cyan-50 border border-cyan-200 rounded-xl">
                  <p className="text-xs font-bold text-[#111]">Ocular Visit</p>
                  <p className="text-[11px] text-[#6B7280]">Ana Villanueva · 2:00 PM</p>
                </div>
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-xs font-semibold text-[#374151]">Staff Briefing</p>
                  <p className="text-[11px] text-[#6B7280]">All staff · 9:00 AM</p>
                </div>
              </div>
            </AdminCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
