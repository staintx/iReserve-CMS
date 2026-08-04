import React from "react";
import { Utensils, CalendarDays, PartyPopper } from "lucide-react";
import { Card, SH } from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";

export default function StepServiceType({ form, setForm }) {
  const nextStepText = () => {
    if (form.service_type === "Event Setup Only") {
      return "We will help you plan the perfect setup, furniture, decor, and event details.";
    }
    return "We will guide you through menu selection, dietary preferences, and beverage options.";
  };

  return (
    <div className="space-y-6">
      <SH title="Choose Your Service Type" sub="What would you like us to provide for your custom booking?" />
      
      <div className="grid gap-4 md:grid-cols-3">
        <button
          type="button"
          className={cn(
            "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all",
            form.service_type === "Food Only"
              ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0]/20"
              : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/40"
          )}
          onClick={() => setForm({ ...form, service_type: "Food Only", include_food: true })}
        >
          <div className={cn("rounded-full p-4 flex items-center justify-center w-16 h-16", form.service_type === "Food Only" ? "bg-[#4C81E0] text-white" : "bg-[#F8FAFC] text-[#94A3B8]")}>
            <Utensils size={24} />
          </div>
          <div>
            <strong className="mb-1 block font-semibold text-[#1E293B]">Food Only</strong>
            <span className="text-sm text-[#64748B]">Menu and catering services</span>
          </div>
        </button>

        <button
          type="button"
          className={cn(
            "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all",
            form.service_type === "Event Setup Only"
              ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0]/20"
              : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/40"
          )}
          onClick={() => setForm({ ...form, service_type: "Event Setup Only", include_food: false })}
        >
          <div className={cn("rounded-full p-4 flex items-center justify-center w-16 h-16", form.service_type === "Event Setup Only" ? "bg-[#4C81E0] text-white" : "bg-[#F8FAFC] text-[#94A3B8]")}>
            <CalendarDays size={24} />
          </div>
          <div>
            <strong className="mb-1 block font-semibold text-[#1E293B]">Event Setup Only</strong>
            <span className="text-sm text-[#64748B]">Planning, setup and decor</span>
          </div>
        </button>

        <button
          type="button"
          className={cn(
            "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all",
            form.service_type === "Food and Event Setup"
              ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0]/20"
              : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/40"
          )}
          onClick={() => setForm({ ...form, service_type: "Food and Event Setup", include_food: true })}
        >
          <div className={cn("rounded-full p-4 flex items-center justify-center w-16 h-16", form.service_type === "Food and Event Setup" ? "bg-[#4C81E0] text-white" : "bg-[#F8FAFC] text-[#94A3B8]")}>
            <PartyPopper size={24} />
          </div>
          <div>
            <strong className="mb-1 block font-semibold text-[#1E293B]">Food and Event Setup</strong>
            <span className="text-sm text-[#64748B]">Complete catering and event services</span>
          </div>
        </button>
      </div>

      <div className="flex gap-4 rounded-2xl border border-[#4C81E0]/20 bg-[#4C81E0]/10 p-5 mt-6">
        <div className="mt-0.5 text-[#4C81E0]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
        <div>
          <strong className="mb-1 block font-semibold text-[#1E293B]">Next Steps</strong>
          <p className="text-sm text-[#64748B]">{nextStepText()}</p>
        </div>
      </div>
    </div>
  );
}
