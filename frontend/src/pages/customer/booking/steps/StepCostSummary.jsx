import { Receipt } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui/card";
import { cn } from "@/lib/utils";

export default function StepCostSummary({ form, initialPackageName, initialPackagePrice, totalPrice, depositAmount, depositPercentage }) {
  
  const guestCount = parseInt(form.guest_count || "0", 10);
  const additionalServicesTotal = form.additional_services?.reduce((acc, svc) => acc + (Number(svc.price || 0) * Number(svc.quantity || 1)), 0) || 0;
  const baseTotalAmount = totalPrice - additionalServicesTotal;
  const isCustom = !initialPackageName;
  const displayName = isCustom ? "Custom Booking" : initialPackageName;
  
  const getBasePriceDescription = () => {
    if (!isCustom) return `₱${(initialPackagePrice || 0).toLocaleString()} x ${guestCount} guests`;
    if (form.service_type === "Event Setup Only") return "Fixed price base setup";
    if (form.service_type === "Food and Event Setup") return `Estimated setup & catering base for ${guestCount} guests`;
    if (form.service_type === "Food Only") {
      if (form.selected_menu && form.selected_menu.length > 0) {
        return `Custom menu selection for ${guestCount} guests`;
      }
    }
    return `Estimated catering base for ${guestCount} guests`;
  };

  return (
    <Card className="overflow-hidden border-border bg-card shadow-soft">
      <div className="border-b border-border p-6 md:p-8">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Cost Summary</h2>
        <p className="text-sm text-muted-foreground">Review your package breakdown and payment details.</p>
      </div>

      <CardContent className="bg-muted/10 p-6 md:p-8">
        <div className="mx-auto max-w-2xl">
          {/* Main Booking Details */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-y-4 rounded-2xl border border-border bg-background p-6 shadow-sm">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected Package</p>
              <p className="font-medium text-foreground">{displayName}</p>
              {isCustom && <p className="mt-1 text-xs text-muted-foreground">{form.service_type}</p>}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guests</p>
              <p className="font-medium text-foreground">{guestCount}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</p>
              <p className="font-medium text-foreground">
                {form.event_date ? new Date(form.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "-"}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</p>
              <p className="font-medium text-foreground">{form.start_time || "-"}</p>
            </div>
          </div>

          {/* Cost Breakdown Table */}
          <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
            <div className="flex items-center justify-between border-b border-border bg-muted/50 px-6 py-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Description</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Amount</span>
            </div>
            <div className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{displayName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{getBasePriceDescription()}</p>
                </div>
                <p className="font-medium text-foreground">₱{baseTotalAmount.toLocaleString()}</p>
              </div>

              {form.service_type === "Food Only" && form.selected_menu && form.selected_menu.length > 0 && (
                <div className="mt-4 space-y-3 border-l-2 border-accent/20 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selected Menu</p>
                  {form.selected_menu.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₱{(item.price || 0).toLocaleString()} / pax</p>
                      </div>
                      <p className="text-sm font-medium text-foreground">₱{((item.price || 0) * guestCount).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {form.additional_services?.map((svc, idx) => {
                const price = Number(svc.price) || 0;
                const qty = Number(svc.quantity) || 1;
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{svc.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">₱{price.toLocaleString()} x {qty}</p>
                    </div>
                    <p className="font-medium text-foreground">₱{(price * qty).toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-5">
              <span className="font-semibold text-foreground">Estimated Total</span>
              <span className="text-xl font-bold text-foreground">₱{totalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* Deposit Required Highlight */}
          <div className="flex items-start gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-6">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Receipt size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1 pt-1">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Deposit Required</h4>
                  <p className="mt-0.5 text-sm text-muted-foreground">A {depositPercentage}% deposit is required to secure your booking.</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-accent">₱{depositAmount.toLocaleString()}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">To be paid today</p>
                </div>
              </div>
              <div className="my-4 h-px w-full bg-accent/20"></div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">Remaining Balance (Due later)</span>
                <span className="font-semibold text-foreground">₱{(totalPrice - depositAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
