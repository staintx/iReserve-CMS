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
              ? "border-[#D4AF37] bg-[#D4AF37]/5 ring-1 ring-[#D4AF37]/20"
              : "border-black/10 bg-white hover:border-[#D4AF37]/40"
          )}
          onClick={() => setForm({ ...form, service_type: "Food Only", include_food: true })}
        >
          <div className={cn("rounded-full p-4 flex items-center justify-center w-16 h-16", form.service_type === "Food Only" ? "bg-[#D4AF37] text-[#111]" : "bg-[#F7F4EE] text-[#9E9E9E]")}>
            <Utensils size={24} />
          </div>
          <div>
            <strong className="mb-1 block font-semibold text-[#111]">Food Only</strong>
            <span className="text-sm text-[#6B6657]">Menu and catering services</span>
          </div>
        </button>

        <button
          type="button"
          className={cn(
            "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all",
            form.service_type === "Event Setup Only"
              ? "border-[#D4AF37] bg-[#D4AF37]/5 ring-1 ring-[#D4AF37]/20"
              : "border-black/10 bg-white hover:border-[#D4AF37]/40"
          )}
          onClick={() => setForm({ ...form, service_type: "Event Setup Only", include_food: false })}
        >
          <div className={cn("rounded-full p-4 flex items-center justify-center w-16 h-16", form.service_type === "Event Setup Only" ? "bg-[#D4AF37] text-[#111]" : "bg-[#F7F4EE] text-[#9E9E9E]")}>
            <CalendarDays size={24} />
          </div>
          <div>
            <strong className="mb-1 block font-semibold text-[#111]">Event Setup Only</strong>
            <span className="text-sm text-[#6B6657]">Planning, setup and decor</span>
          </div>
        </button>

        <button
          type="button"
          className={cn(
            "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all",
            form.service_type === "Food and Event Setup"
              ? "border-[#D4AF37] bg-[#D4AF37]/5 ring-1 ring-[#D4AF37]/20"
              : "border-black/10 bg-white hover:border-[#D4AF37]/40"
          )}
          onClick={() => setForm({ ...form, service_type: "Food and Event Setup", include_food: true })}
        >
          <div className={cn("rounded-full p-4 flex items-center justify-center w-16 h-16", form.service_type === "Food and Event Setup" ? "bg-[#D4AF37] text-[#111]" : "bg-[#F7F4EE] text-[#9E9E9E]")}>
            <PartyPopper size={24} />
          </div>
          <div>
            <strong className="mb-1 block font-semibold text-[#111]">Food and Event Setup</strong>
            <span className="text-sm text-[#6B6657]">Complete catering and event services</span>
          </div>
        </button>
      </div>

      <div className="flex gap-4 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-5 mt-6">
        <div className="mt-0.5 text-[#D4AF37]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
        <div>
          <strong className="mb-1 block font-semibold text-[#111]">Next Steps</strong>
          <p className="text-sm text-[#6B6657]">{nextStepText()}</p>
        </div>
      </div>
    </div>
  );
}
