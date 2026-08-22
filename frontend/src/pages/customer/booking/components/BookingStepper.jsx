import { Check } from "lucide-react";
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
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all duration-200 text-left",
                  isActive
                    ? "bg-[#4C81E0] text-white shadow-sm ring-2 ring-[#4C81E0]/20 cursor-default"
                    : isCompleted
                      ? "bg-[#D6E4F7] text-[#1E293B] hover:bg-[#c2d7f3] cursor-pointer active:scale-95"
                      : isClickable
                        ? "bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] cursor-pointer active:scale-95"
                        : "bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed opacity-80",
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
              </button>
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

