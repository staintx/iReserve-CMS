import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluatePassword } from "./passwordPolicy";

const meterTones = {
  empty: { width: "0%", bar: "", label: "", text: "" },
  weak: { width: "25%", bar: "bg-[#DC2626]", label: "Weak", text: "text-[#DC2626]" },
  fair: { width: "55%", bar: "bg-amber-500", label: "Fair", text: "text-amber-600" },
  good: { width: "82%", bar: "bg-emerald-500", label: "Good", text: "text-emerald-600" },
  strong: { width: "100%", bar: "bg-emerald-500", label: "Strong", text: "text-emerald-600" },
};

/**
 * Live password checklist, kept deliberately flat — a hairline meter and a row
 * of inline rules rather than a second bordered panel competing with the field
 * above it. Requirements are quiet while unmet and settle into a success state
 * as they are satisfied; the count is announced politely for screen readers.
 */
export default function PasswordRequirements({ value = "", id, className = "" }) {
  const { results, met, total, strength } = evaluatePassword(value);
  const meter = meterTones[strength] || meterTones.empty;

  return (
    <div id={id} className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2.5">
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-[#E2E8F0]" aria-hidden="true">
          <span
            className={cn("block h-full rounded-full transition-all duration-300 ease-out", meter.bar)}
            style={{ width: meter.width }}
          />
        </span>
        <span
          className={cn("w-11 shrink-0 text-right text-[11px] font-semibold", meter.text)}
          aria-hidden="true"
        >
          {meter.label}
        </span>
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {results.map((rule) => (
          <li
            key={rule.id}
            className={cn(
              "inline-flex items-center gap-1 text-[11px] transition-colors duration-200",
              rule.met ? "font-medium text-emerald-700" : "text-[#64748B]"
            )}
          >
            <span
              className={cn(
                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                rule.met ? "scale-100 bg-emerald-500 text-white" : "scale-90 bg-[#E2E8F0]"
              )}
              aria-hidden="true"
            >
              {rule.met && <Check size={9} strokeWidth={4} />}
            </span>
            {rule.label}
          </li>
        ))}
      </ul>

      <p className="sr-only" aria-live="polite">
        {value ? `${met} of ${total} password requirements met.` : ""}
      </p>
    </div>
  );
}
