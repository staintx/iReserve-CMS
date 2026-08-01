import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BookingStepper({ currentStepIndex, steps = [] }) {
  if (steps.length === 0) {
    steps = [
      { label: "Package", key: "package" },
      { label: "Date & Time", key: "datetime" },
      { label: "Event Details", key: "event" },
      { label: "Cost Summary", key: "summary" },
      { label: "Contact Information", key: "contact" },
      { label: "Review Booking", key: "review" },
      { label: "Payment", key: "payment" },
    ];
  }

  return (
    <div className="flex items-center justify-center flex-wrap gap-1 py-4">
      {steps.map((step, index) => {
        const isActive = index + 1 === currentStepIndex;
        const isCompleted = index + 1 < currentStepIndex;
        
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
              isCompleted ? "bg-[#D4AF37] text-[#111]" : 
              isActive ? "bg-[#111] text-white" : 
              "bg-[#F0EDE6] text-[#9E9E9E]"
            )}>
              {isCompleted ? <Check size={10} strokeWidth={3} /> : <span className="w-3.5 text-center">{index + 1}</span>}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn("h-px w-4", isCompleted ? "bg-[#D4AF37]" : "bg-[#E0DDD6]")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
