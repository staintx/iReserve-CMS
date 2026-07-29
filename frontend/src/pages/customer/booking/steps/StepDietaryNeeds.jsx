import React from "react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import LiveEstimate from "../components/LiveEstimate";

export default function StepDietaryNeeds({ form, setForm, totalPrice, depositAmount, onNext }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card className="flex-1 overflow-hidden border-border bg-card shadow-soft">
        <div className="border-b border-border bg-accent/5 p-6 md:p-8">
          <h2 className="mb-2 text-2xl font-bold text-foreground">Dietary Needs</h2>
          <p className="text-sm text-muted-foreground">Please let us know of any allergies or dietary restrictions.</p>
        </div>

        <CardContent className="p-6 md:p-8">
          <div className="space-y-2">
            <Label>Allergies and Intolerances (Optional)</Label>
            <textarea
              className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Nut allergies, seafood allergies, lactose intolerance, etc."
              value={form.allergies || ""}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
            ></textarea>
          </div>
        </CardContent>
      </Card>

      <LiveEstimate form={form} totalPrice={totalPrice} depositAmount={depositAmount} onNext={onNext} />
    </div>
  );
}
