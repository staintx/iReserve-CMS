import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import { AdminAPI } from "../../api/admin";
import Modal from "../../components/common/Modal";
import useToast from "../../hooks/useToast";

export default function AdminCalendar() {
  const { notify } = useToast();
  const [view, setView] = useState("month");
  
  // Calendar State
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  
  // Data State
  const [bookings, setBookings] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  
  // Modal State
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [selectedDateToBlock, setSelectedDateToBlock] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const fetchData = async () => {
    try {
      const [bookingsRes, blockedDatesRes] = await Promise.all([
        AdminAPI.getBookings(),
        AdminAPI.getBlockedDates()
      ]);
      setBookings(bookingsRes.data.filter((b) => 
        ["pending deposit", "confirmed", "preparing", "ongoing"].includes(b.status)
      ));
      setBlockedDates(blockedDatesRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const getDayEvents = (day) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    targetDate.setHours(0, 0, 0, 0);
    const targetMs = targetDate.getTime();

    const events = [];

    // Add Blocked Dates
    blockedDates.forEach(bd => {
      const bDate = new Date(bd.date);
      bDate.setHours(0, 0, 0, 0);
      if (bDate.getTime() === targetMs) {
        events.push({
          type: 'blocked',
          id: bd._id,
          label: bd.reason || 'Blocked',
          color: 'bg-gray-400'
        });
      }
    });

    // Add Bookings
    bookings.forEach(b => {
      if (!b.event_date) return;
      const bDate = new Date(b.event_date);
      bDate.setHours(0, 0, 0, 0);
      if (bDate.getTime() === targetMs) {
        let color = "bg-emerald-500";
        const evtType = b.event_type?.toLowerCase() || "";
        if (evtType.includes("corporate")) color = "bg-blue-500";
        else if (evtType.includes("birthday") || evtType.includes("debut")) color = "bg-purple-500";
        else if (evtType.includes("ocular")) color = "bg-cyan-500";
        else if (b.package_id?.name?.toLowerCase().includes("gold")) color = "bg-[#D4AF37]";

        events.push({
          type: 'booking',
          id: b._id,
          label: `${b.event_type || 'Event'} - ${b.customer_id?.full_name || 'Customer'}`,
          color
        });
      }
    });

    return events;
  };

  const handleBlockDateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDateToBlock) return notify("Please select a date", "error");
    try {
      await AdminAPI.blockDate({ date: selectedDateToBlock, reason: blockReason });
      notify("Date blocked successfully", "success");
      setIsBlockModalOpen(false);
      setBlockReason("");
      setSelectedDateToBlock("");
      fetchData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to block date", "error");
    }
  };

  const handleUnblockDate = async (id) => {
    if (!window.confirm("Are you sure you want to unblock this date?")) return;
    try {
      await AdminAPI.unblockDate(id);
      notify("Date unblocked successfully", "success");
      fetchData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to unblock date", "error");
    }
  };

  // Find today's events for the sidebar
  const todayEvents = useMemo(() => {
    const t = new Date();
    t.setHours(0,0,0,0);
    const targetMs = t.getTime();
    
    return bookings.filter(b => {
      if (!b.event_date) return false;
      const bDate = new Date(b.event_date);
      bDate.setHours(0,0,0,0);
      return bDate.getTime() === targetMs;
    });
  }, [bookings]);

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
            <Btn variant="gold" size="sm" onClick={() => setIsBlockModalOpen(true)}>
              <Plus size={13} /> Block Date
            </Btn>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-3">
            <AdminCard className="!p-5">
              <div className="flex items-center justify-between mb-5">
                <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16} /></button>
                <p className="font-bold text-[#111]">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
                <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight size={16} /></button>
              </div>
              <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-[#9CA3AF] py-1">{d}</div>)}
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getDayEvents(day);
                  const isToday = today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();
                  
                  return (
                    <div 
                      key={day} 
                      className={`min-h-[90px] p-1.5 rounded-xl border transition-colors cursor-pointer ${isToday ? "border-[#D4AF37] bg-[#D4AF37]/5" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}
                      onClick={() => {
                        const fmtDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                        setSelectedDateToBlock(fmtDate);
                        setIsBlockModalOpen(true);
                      }}
                    >
                      <p className={`text-xs font-semibold mb-1 ${isToday ? "text-[#D4AF37]" : "text-[#374151]"}`}>{day}</p>
                      <div className="space-y-1">
                        {dayEvents.map((e, ei) => (
                          <div 
                            key={ei} 
                            onClick={(evt) => {
                              evt.stopPropagation();
                              if (e.type === 'blocked') {
                                handleUnblockDate(e.id);
                              }
                            }}
                            className={`${e.color} text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:opacity-80 flex items-center justify-between`}
                            title={e.label}
                          >
                            <span className="truncate">{e.label}</span>
                            {e.type === 'blocked' && <Trash2 size={10} className="shrink-0 ml-1 opacity-70" />}
                          </div>
                        ))}
                      </div>
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
                ["bg-blue-500", "Corporate"],
                ["bg-purple-500", "Birthday/Debut"],
                ["bg-[#D4AF37]", "Gold Package"],
                ["bg-cyan-500", "Ocular Visit"],
                ["bg-gray-400", "Blocked / Holiday"]
              ].map(([c, l]) => (
                <div key={l} className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-sm ${c} flex-shrink-0`} />
                  <p className="text-xs text-[#6B7280]">{l}</p>
                </div>
              ))}
            </AdminCard>
            
            <AdminCard className="!p-4">
              <p className="font-bold text-[#111] text-sm mb-3">Today — {today.toLocaleString('default', { month: 'short', day: 'numeric' })}</p>
              <div className="space-y-2">
                {todayEvents.length > 0 ? todayEvents.map(evt => (
                  <div key={evt._id} className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs font-bold text-[#111]">{evt.event_type || 'Event'}</p>
                    <p className="text-[11px] text-[#6B7280]">{evt.customer_id?.full_name} · {evt.start_time}</p>
                  </div>
                )) : (
                  <p className="text-xs text-gray-500 italic">No events today</p>
                )}
              </div>
            </AdminCard>
          </div>
        </div>
      </div>

      {isBlockModalOpen && (
        <Modal title="Block a Date" onClose={() => setIsBlockModalOpen(false)}>
          <form onSubmit={handleBlockDateSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Select Date</label>
              <input
                type="date"
                required
                value={selectedDateToBlock}
                onChange={(e) => setSelectedDateToBlock(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Holiday, Maintenance"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Btn variant="outline" type="button" onClick={() => setIsBlockModalOpen(false)}>Cancel</Btn>
              <Btn variant="gold" type="submit">Block Date</Btn>
            </div>
          </form>
        </Modal>
      )}
    </AdminLayout>
  );
}
