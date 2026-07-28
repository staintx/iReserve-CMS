import React from "react";
import { Utensils, CalendarDays, PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StepServiceType({ form, setForm }) {
  const nextStepText = () => {
    if (form.service_type === "Event Setup Only") {
      return "We will help you plan the perfect setup, furniture, decor, and event details.";
    }
    return "We will guide you through menu selection, dietary preferences, and beverage options.";
  };

  return (
    <Card className="overflow-hidden border-border bg-card shadow-soft">
      <div className="border-b border-border bg-accent/5 p-6 md:p-8">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Choose Your Service Type</h2>
        <p className="text-sm text-muted-foreground">What would you like us to provide for your custom booking?</p>
      </div>

      <CardContent className="p-6 md:p-8">
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <button
            type="button"
            className={cn(
              "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all",
              form.service_type === "Food Only"
                ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                : "border-border bg-background hover:border-border/80 hover:bg-muted/50"
            )}
            onClick={() => setForm({ ...form, service_type: "Food Only", include_food: true })}
          >
            <div className={cn("rounded-full p-4", form.service_type === "Food Only" ? "bg-background shadow-sm" : "bg-muted")}>
              <Utensils className={cn("h-8 w-8", form.service_type === "Food Only" ? "text-accent" : "text-muted-foreground")} />
            </div>
            <div>
              <strong className="mb-1 block font-semibold text-foreground">Food Only</strong>
              <span className="text-sm text-muted-foreground">Menu and catering services</span>
            </div>
          </button>

          <button
            type="button"
            className={cn(
              "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all",
              form.service_type === "Event Setup Only"
                ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                : "border-border bg-background hover:border-border/80 hover:bg-muted/50"
            )}
            onClick={() => setForm({ ...form, service_type: "Event Setup Only", include_food: false })}
          >
            <div className={cn("rounded-full p-4", form.service_type === "Event Setup Only" ? "bg-background shadow-sm" : "bg-muted")}>
              <CalendarDays className={cn("h-8 w-8", form.service_type === "Event Setup Only" ? "text-accent" : "text-muted-foreground")} />
            </div>
            <div>
              <strong className="mb-1 block font-semibold text-foreground">Event Setup Only</strong>
              <span className="text-sm text-muted-foreground">Planning, setup and decor</span>
            </div>
          </button>

          <button
            type="button"
            className={cn(
              "flex flex-col items-center gap-3 rounded-2xl border-2 p-6 text-center transition-all",
              form.service_type === "Food and Event Setup"
                ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                : "border-border bg-background hover:border-border/80 hover:bg-muted/50"
            )}
            onClick={() => setForm({ ...form, service_type: "Food and Event Setup", include_food: true })}
          >
            <div className={cn("rounded-full p-4", form.service_type === "Food and Event Setup" ? "bg-background shadow-sm" : "bg-muted")}>
              <PartyPopper className={cn("h-8 w-8", form.service_type === "Food and Event Setup" ? "text-accent" : "text-muted-foreground")} />
            </div>
            <div>
              <strong className="mb-1 block font-semibold text-foreground">Food and Event Setup</strong>
              <span className="text-sm text-muted-foreground">Complete catering and event services</span>
            </div>
          </button>
        </div>

        <div className="flex gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-primary">
          <div className="mt-0.5 text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <div>
            <strong className="mb-1 block font-semibold text-foreground">Next Steps</strong>
            <p className="text-sm text-muted-foreground">{nextStepText()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
