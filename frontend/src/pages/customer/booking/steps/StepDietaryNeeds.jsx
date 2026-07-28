import React from "react";
import { HelpCircle } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";

export default function StepDietaryNeeds({ form, setForm }) {
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

      <div className="w-full flex-shrink-0 lg:w-80">
        <Card className="sticky top-24 border-border bg-card p-6 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-foreground">
            <HelpCircle size={20} className="text-accent" />
            <h3 className="text-lg font-semibold">Need Help?</h3>
          </div>
          
          <div className="mb-6 space-y-4 text-sm">
            <div>
              <p className="font-semibold text-foreground">Call Us</p>
              <p className="text-muted-foreground">(555) 123-4567</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Email Us</p>
              <p className="text-muted-foreground">support@caterer.com</p>
            </div>
          </div>
          
          <hr className="mb-6 border-border" />
          
          <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Tips</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-0.5 text-accent">•</span>
              Consider dietary restrictions of all your guests
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 text-accent">•</span>
              We can accommodate most major allergies with advance notice
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
