import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Only rendered if a caller passes no steps at all. Mirrors the longest real
// path built in BookingWizard#wizardSteps so the labels never contradict it.
const FALLBACK_STEPS = [
  { label: "Date & time", key: "datetime" },
  { label: "Package", key: "package" },
  { label: "Event details", key: "event" },
  { label: "Menu", key: "menu" },
  { label: "Dietary needs", key: "dietary" },
  { label: "Extras", key: "addons" },
  { label: "Contact", key: "contact" },
  { label: "Review", key: "review" },
];


export default function BookingStepper({
  currentStepIndex,
  steps = [],
  onStepClick,
  maxStepReached = currentStepIndex,
  isEditing = false,
}) {
  const items = steps.length === 0 ? FALLBACK_STEPS : steps;
  const total = items.length;
  const current = Math.min(Math.max(currentStepIndex, 1), total);
  const activeStep = items[current - 1];
  const nextStep = items[current];
  const progress = (current / total) * 100;

  return (
    <nav aria-label="Booking progress" className="w-full">
      {/* Compact progress bar + context — small screens */}
      <div className="md:hidden">
        <div className="mb-1.5 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <p className="truncate min-w-0 text-xs min-[360px]:text-sm font-semibold text-[#1E293B]">
              {activeStep?.label}
            </p>
            <span className="shrink-0 text-[11px] font-medium text-[#64748B] tabular-nums whitespace-nowrap">
              ({current}/{total})
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("open-zelle-chat", {
                  detail: { tab: "zelle" },
                }),
              )
            }
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#4C81E0]/15 text-[#2563EB] border border-[#4C81E0]/35 hover:bg-[#4C81E0]/25 hover:border-[#4C81E0]/60 active:scale-95 transition-all text-[11px] font-semibold shrink-0 cursor-pointer shadow-2xs"
            aria-label="Ask Zelle AI Assistant"
            title="Ask Zelle AI Assistant"
          >
            <Sparkles size={11} className="text-amber-500 shrink-0" />
            <span className="hidden min-[375px]:inline">Ask Zelle</span>
            <span className="min-[375px]:hidden">AI</span>
          </button>
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
      <ol className="hidden items-center gap-1 md:flex overflow-x-auto py-1">
        {items.map((step, index) => {
          const isActive = index + 1 === current;
          const isCompleted = index + 1 < current;
          const isClickable =
            Boolean(onStepClick) &&
            (isCompleted || isEditing || index + 1 <= maxStepReached);

          return (
            <li
              key={step.key ?? step.label}
              className={cn(
                "flex min-w-0 items-center",
                isActive ? "shrink-0" : "min-w-0",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <button
                type="button"
                disabled={!isClickable || isActive}
                onClick={() => onStepClick && onStepClick(index)}
                title={
                  isClickable && !isActive
                    ? `Jump to ${step.label}`
                    : undefined
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all duration-150 text-left cursor-pointer",
                  isActive
                    ? "bg-[#4C81E0] text-white shadow-2xs cursor-default"
                    : isCompleted
                      ? "bg-blue-50/80 text-blue-900 border border-blue-200/70 hover:bg-blue-100/80 active:scale-95"
                      : isClickable
                        ? "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 active:scale-95"
                        : "bg-slate-50 text-slate-400 border border-transparent cursor-not-allowed opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                    isCompleted
                      ? "bg-[#4C81E0] text-white"
                      : isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-500",
                  )}
                >
                  {isCompleted ? (
                    <Check size={9} strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="truncate">{step.label}</span>
                {isCompleted && <span className="sr-only">completed</span>}
              </button>
              {index < items.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-1 h-px w-2.5 shrink-0 transition-colors duration-150 lg:w-4",
                    isCompleted ? "bg-[#4C81E0]/40" : "bg-slate-200",
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

