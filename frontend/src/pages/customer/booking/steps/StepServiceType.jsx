import { Utensils, CalendarDays, PartyPopper, Check } from "lucide-react";
import {
  Card,
  SH,
  SelectableCard,
  SectionTitle,
  StepShell,
} from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";
import {
  SERVICE_TYPES,
  SERVICE_PATHS,
  WHAT_HAPPENS_NEXT,
} from "../lib/bookingRules";

const SERVICE_OPTIONS = [
  { value: SERVICE_TYPES.FOOD_ONLY, icon: Utensils, includesFood: true },
  { value: SERVICE_TYPES.SETUP_ONLY, icon: CalendarDays, includesFood: false },
  { value: SERVICE_TYPES.FULL_SERVICE, icon: PartyPopper, includesFood: true },
];

export default function StepServiceType({ form, setForm }) {
  const active = SERVICE_PATHS[form.service_type];

  return (
    <StepShell width="medium">
      <SH
        title="What Do You Need From Us?"
        sub="This decides what we ask you for next. You can go back and change it at any point."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {SERVICE_OPTIONS.map((option) => {
          const { value, includesFood } = option;
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
              className="flex flex-col items-center gap-2.5 p-5 text-center"
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                  selected
                    ? "bg-[#4C81E0] text-white"
                    : "bg-[#F1F5F9] text-[#94A3B8]",
                )}
              >
                <Icon size={20} />
              </span>
              <span className="block font-semibold text-[#1E293B]">
                {path.title}
              </span>
              <span className="block text-[13px] leading-snug text-[#64748B]">
                {path.description}
              </span>
            </SelectableCard>
          );
        })}
      </div>

      {active && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-4 sm:p-5">
            <SectionTitle>What we&apos;ll ask you for</SectionTitle>
            <ol className="space-y-2 text-[13px] text-[#64748B]">
              {active.steps.map((item, index) => (
                <li key={item} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-[#64748B]">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
            <p className="mt-3 border-t border-[#E2E8F0] pt-3 text-[13px] text-[#64748B]">
              {active.pricing}
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionTitle>What happens after you submit</SectionTitle>
            <ol className="space-y-2 text-[13px] text-[#64748B]">
              {WHAT_HAPPENS_NEXT.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check
                    size={15}
                    className="mt-0.5 shrink-0 text-[#4C81E0]"
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </StepShell>
  );
}
