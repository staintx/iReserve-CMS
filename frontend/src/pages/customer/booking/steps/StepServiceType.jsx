import { Utensils, CalendarDays, PartyPopper, Check, Sparkles, ShieldCheck } from "lucide-react";
import {
  SH,
  SelectableCard,
  StepShell,
} from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";
import {
  SERVICE_TYPES,
  SERVICE_PATHS,
} from "../lib/bookingRules";

const SERVICE_OPTIONS = [
  {
    value: SERVICE_TYPES.FOOD_ONLY,
    icon: Utensils,
    includesFood: true,
    features: [
      "Cooked fresh & delivered or collected",
      "No tables, styling, or setup needed",
      "Priced per guest by dish choices",
    ],
  },
  {
    value: SERVICE_TYPES.SETUP_ONLY,
    icon: CalendarDays,
    includesFood: false,
    features: [
      "Stage, backdrop, tables & styling",
      "Full teardown included",
      "Priced by venue scaffold size",
    ],
  },
  {
    value: SERVICE_TYPES.FULL_SERVICE,
    icon: PartyPopper,
    includesFood: true,
    features: [
      "Full catering & buffet station",
      "Complete venue styling & dining setup",
      "Dedicated coordinator & service crew",
    ],
  },
];

export default function StepServiceType({ form, setForm }) {
  const active = SERVICE_PATHS[form.service_type];

  return (
    <StepShell width="wide">
      <SH
        title="What Do You Need From Us?"
        sub="Select a service type. You can switch this at any point before submitting."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {SERVICE_OPTIONS.map((option) => {
          const { value, includesFood, features } = option;
          const Icon = option.icon;
          const path = SERVICE_PATHS[value];
          const selected = form.service_type === value;

          return (
            <SelectableCard
              key={value}
              selected={selected}
              onClick={() =>
                setForm({ ...form, service_type: value, include_food: includesFood })
              }
              className="flex flex-col justify-between p-4"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-2.5">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                      selected
                        ? "bg-[#4C81E0] text-white"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 pr-4">
                    <span className="block font-bold text-sm text-slate-900 leading-tight">
                      {path.title}
                    </span>
                    <span className="block text-[11px] text-slate-500 line-clamp-1">
                      {path.description}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2.5 space-y-1.5">
                  {features.map((feat) => (
                    <div key={feat} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <Check
                        size={13}
                        className={cn(
                          "mt-0.5 shrink-0",
                          selected ? "text-[#4C81E0]" : "text-slate-400",
                        )}
                      />
                      <span className="leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3.5 pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-medium flex items-center justify-between">
                <span>{path.pricing}</span>
                {selected && (
                  <span className="text-[#4C81E0] font-bold text-[10px] uppercase tracking-wider">
                    Selected
                  </span>
                )}
              </div>
            </SelectableCard>
          );
        })}
      </div>

      {/* High-density workflow guarantee & trust note */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
          <span>
            <strong className="font-semibold text-slate-800">Draft Request:</strong> Sending this asks for an itemized quotation. No payment is taken today.
          </span>
        </div>
        {active && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Next up:</span>
            <span>Date &amp; time</span>
          </div>
        )}
      </div>
    </StepShell>
  );
}
