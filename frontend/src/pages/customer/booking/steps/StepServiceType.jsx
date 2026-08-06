import React from "react";
import { Utensils, CalendarDays, PartyPopper, Info } from "lucide-react";
import { SH, SelectableCard, InfoNote, StepShell } from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";

const SERVICE_OPTIONS = [
  {
    value: "Food Only",
    icon: Utensils,
    title: "Food Only",
    description: "Menu and catering services",
    includesFood: true,
  },
  {
    value: "Event Setup Only",
    icon: CalendarDays,
    title: "Event Setup Only",
    description: "Planning, setup and decor",
    includesFood: false,
  },
  {
    value: "Food and Event Setup",
    icon: PartyPopper,
    title: "Food and Event Setup",
    description: "Complete catering and event services",
    includesFood: true,
  },
];

export default function StepServiceType({ form, setForm }) {
  const nextStepText = () => {
    if (form.service_type === "Event Setup Only") {
      return "We will help you plan the perfect setup, furniture, decor, and event details.";
    }
    return "We will guide you through menu selection, dietary preferences, and beverage options.";
  };

  return (
    <StepShell width="medium">
      <SH
        title="Choose Your Service Type"
        sub="What would you like us to provide for your custom booking?"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {SERVICE_OPTIONS.map((option) => {
          const { value, title, description, includesFood } = option;
          const Icon = option.icon;
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
              <span className="block font-semibold text-[#1E293B]">{title}</span>
              <span className="block text-[13px] leading-snug text-[#64748B]">
                {description}
              </span>
            </SelectableCard>
          );
        })}
      </div>

      <InfoNote icon={Info} title="Next Steps" className="mt-4">
        {nextStepText()}
      </InfoNote>
    </StepShell>
  );
}
