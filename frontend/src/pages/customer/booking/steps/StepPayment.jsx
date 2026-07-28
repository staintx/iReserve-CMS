import { useState } from "react";
import { CreditCard, Smartphone, Banknote, ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { cn } from "@/lib/utils";

export default function StepPayment({ depositAmount, isSubmitting, onSubmit, error }) {
  const [selectedMethod, setSelectedMethod] = useState("gcash");
  
  const paymentMethods = [
    { id: "gcash", name: "GCash", icon: Smartphone, color: "text-blue-500", desc: "Pay securely via GCash" },
    { id: "paymaya", name: "Maya", icon: Smartphone, color: "text-emerald-500", desc: "Pay securely via Maya" },
    { id: "card", name: "Credit / Debit Card", icon: CreditCard, color: "text-muted-foreground", desc: "Visa, Mastercard, JCB" },
    { id: "online_banking", name: "Online Banking", icon: Banknote, color: "text-orange-500", desc: "BPI, UnionBank, etc." },
  ];

  const handlePay = () => {
    onSubmit(selectedMethod);
  };

  return (
    <Card className="overflow-hidden border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border bg-accent/5 p-6 md:p-8">
        <div>
          <h2 className="mb-1 text-2xl font-bold text-foreground">Payment Method</h2>
          <p className="text-sm text-muted-foreground">Select how you want to pay the deposit.</p>
        </div>
        <div className="text-right">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount to Pay</p>
          <p className="text-2xl font-bold text-accent">₱{depositAmount.toLocaleString()}</p>
        </div>
      </div>

      <CardContent className="mx-auto max-w-2xl p-6 md:p-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        <div className="mb-8 space-y-4">
          {paymentMethods.map(method => {
            const isSelected = selectedMethod === method.id;
            const Icon = method.icon;
            
            return (
              <label 
                key={method.id} 
                className={cn(
                  "flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-5 transition-all",
                  isSelected ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border bg-background hover:border-accent/50",
                  isSubmitting ? "cursor-not-allowed opacity-50" : ""
                )}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={method.id}
                  checked={isSelected}
                  onChange={() => !isSubmitting && setSelectedMethod(method.id)}
                  disabled={isSubmitting}
                  className="h-5 w-5 border-input text-primary focus:ring-primary"
                />
                <div className={cn("rounded-xl p-3", isSelected ? "bg-background shadow-sm" : "bg-muted")}>
                  <Icon className={cn("h-6 w-6", method.color)} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{method.name}</h4>
                  <p className="mt-0.5 text-sm text-muted-foreground">{method.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
        
        <div className="mb-8 flex items-center justify-between rounded-2xl border border-border bg-muted/30 p-5">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span>Payments are securely processed by <strong className="text-foreground">PayMongo</strong>.</span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handlePay}
            disabled={isSubmitting}
            className="px-10 py-6 text-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing Payment...
              </>
            ) : (
              `Pay ₱${depositAmount.toLocaleString()}`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
