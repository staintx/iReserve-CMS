import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const FALLBACK_STEPS = [
  { label: "Package", key: "package" },
  { label: "Date & Time", key: "datetime" },
  { label: "Event Details", key: "event" },
  { label: "Cost Summary", key: "summary" },
  { label: "Contact Information", key: "contact" },
  { label: "Review Booking", key: "review" },
  { label: "Payment", key: "payment" },
];

export default function BookingStepper({ currentStepIndex, steps = [] }) {
  const items = steps.length === 0 ? FALLBACK_STEPS : steps;
  const total = items.length;
  const current = Math.min(Math.max(currentStepIndex, 1), total);
  const activeStep = items[current - 1];
  const nextStep = items[current];
  const progress = (current / total) * 100;

  return (
    <nav aria-label="Booking progress" className="w-full">
      {/* Compact progress bar + context — the only progress UI on small screens */}
      <div className="md:hidden">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-semibold text-[#1E293B]">
            {activeStep?.label}
          </p>
          <p className="shrink-0 text-xs font-medium text-[#64748B]">
            Step {current} of {total}
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
          <div
            className="h-full rounded-full bg-[#4C81E0] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {nextStep && (
          <p className="mt-1.5 text-xs text-[#94A3B8]">Next: {nextStep.label}</p>
        )}
      </div>

      {/* Full stepper — desktop */}
      <ol className="hidden items-center gap-1 md:flex">
        {items.map((step, index) => {
          const isActive = index + 1 === current;
          const isCompleted = index + 1 < current;

          return (
            <li
              key={step.key ?? step.label}
              className={cn("flex min-w-0 items-center", isActive ? "shrink-0" : "min-w-0")}
              aria-current={isActive ? "step" : undefined}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200",
                  isCompleted
                    ? "bg-[#D6E4F7] text-[#1E293B]"
                    : isActive
                      ? "bg-[#4C81E0] text-white shadow-sm"
                      : "bg-[#F1F5F9] text-[#94A3B8]",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]",
                    isCompleted
                      ? "bg-[#4C81E0] text-white"
                      : isActive
                        ? "bg-white/25 text-white"
                        : "bg-white text-[#94A3B8]",
                  )}
                >
                  {isCompleted ? (
                    <Check size={10} strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="truncate lg:max-w-none">{step.label}</span>
                {isCompleted && <span className="sr-only">completed</span>}
              </div>
              {index < items.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-1 h-px w-3 shrink-0 transition-colors duration-200 lg:w-5",
                    isCompleted ? "bg-[#4C81E0]/50" : "bg-[#E2E8F0]",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
