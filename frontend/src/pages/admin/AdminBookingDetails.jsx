import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Printer, Check, Phone, Mail, MapPin } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { RESERVATIONS_DATA } from "../../components/admin/ui/data";

export default function AdminBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Find booking or default to first if not found (for demo purposes)
  const bookingId = id || "CRS-KP8X4M";
  const r = RESERVATIONS_DATA.find(x => x.id === bookingId) || RESERVATIONS_DATA[0];
  
  const TIMELINE_STEPS = ["Booking Requested", "Deposit Paid", "Approved", "Ocular Scheduled", "Staff Assigned", "Final Payment", "Ready for Event", "Completed"];
  const completedIdx = r.status === "completed" ? 7 : r.status === "confirmed" ? 4 : r.status === "ocular-pending" ? 3 : 1;

  const fmt = (n) => "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 0 });

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate("/admin/bookings/reservations")} className="text-[#6B7280] hover:text-[#111] flex items-center gap-1 text-sm transition-colors">
            <ChevronLeft size={15} /> Reservations
          </button>
          <ChevronRight size={13} className="text-[#D1D5DB]" />
          <span className="text-sm font-semibold text-[#111]">{r.id}</span>
          <Badge status={r.status} />
          <div className="ml-auto flex gap-2">
            <Btn size="sm" variant="secondary"><Printer size={13} /> Print Invoice</Btn>
            {r.status === "pending" && <Btn size="sm" variant="gold"><Check size={13} /> Approve Booking</Btn>}
          </div>
        </div>

        {/* Progress Timeline */}
        <AdminCard className="!p-5">
          <p className="font-bold text-[#111] text-sm mb-4">Booking Progress</p>
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {TIMELINE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${i <= completedIdx ? "border-[#D4AF37] bg-[#D4AF37] text-[#111]" : i === completedIdx + 1 ? "border-[#D4AF37] bg-white text-[#D4AF37]" : "border-gray-200 bg-white text-[#9CA3AF]"}`}>
                    {i <= completedIdx ? <Check size={12} /> : i + 1}
                  </div>
                  <p className={`text-[10px] font-medium mt-1.5 text-center max-w-16 leading-tight ${i <= completedIdx ? "text-[#111]" : "text-[#9CA3AF]"}`}>{step}</p>
                </div>
                {i < TIMELINE_STEPS.length - 1 && <div className={`h-0.5 w-10 mb-5 mx-1 ${i < completedIdx ? "bg-[#D4AF37]" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </AdminCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Customer Info */}
          <AdminCard className="!p-5">
            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Customer Information</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] font-bold">
                {r.customer.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="font-bold text-[#111]">{r.customer}</p>
                <p className="text-xs text-[#6B7280]">Regular Client</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><Phone size={13} className="text-[#9CA3AF]" /><span className="text-[#374151]">{r.phone}</span></div>
              <div className="flex items-center gap-2"><Mail size={13} className="text-[#9CA3AF]" /><span className="text-[#374151]">{r.email}</span></div>
              <div className="flex items-center gap-2"><MapPin size={13} className="text-[#9CA3AF]" /><span className="text-[#374151]">BGC, Taguig City</span></div>
            </div>
          </AdminCard>

          {/* Event Info */}
          <AdminCard className="!p-5">
            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Event Information</p>
            <div className="space-y-2.5 text-sm">
              {[
                ["Type", r.eventType], 
                ["Date", r.date], 
                ["Venue", r.venue], 
                ["Guests", `${r.guests} pax`], 
                ["Theme", "Classic Elegance"], 
                ["Special Requests", "Surprise décor"]
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b border-gray-50 pb-1.5 last:border-0 last:pb-0">
                  <span className="text-[#6B7280]">{l}</span>
                  <span className="font-semibold text-[#111] text-right">{v}</span>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* Financials */}
          <AdminCard className="!p-5">
            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-3">Financial Summary</p>
            <div className="space-y-2.5 text-sm mb-4">
              <div className="flex justify-between border-b border-gray-50 pb-1.5">
                <span className="text-[#6B7280]">Total Amount</span>
                <span className="font-semibold text-[#111]">{fmt(r.total)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-1.5">
                <span className="text-[#6B7280] flex items-center gap-1.5">Deposit (30%) <Badge status={r.depositStatus} /></span>
                <span className="font-semibold text-[#111]">{fmt(r.deposit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] flex items-center gap-1.5">Final Payment <Badge status={r.finalPayment} /></span>
                <span className="font-semibold text-[#111]">{fmt(r.total - r.deposit)}</span>
              </div>
            </div>
            {r.finalPayment === "Pending" && (
              <Btn size="sm" variant="gold" className="w-full justify-center">Record Payment</Btn>
            )}
          </AdminCard>
        </div>
      </div>
    </AdminLayout>
  );
}
