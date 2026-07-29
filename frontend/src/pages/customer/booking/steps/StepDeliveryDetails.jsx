import React from "react";
import { Plus, Minus } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import { Input } from "../../../../components/ui/input";
import LiveEstimate from "../components/LiveEstimate";

export default function StepDeliveryDetails({ form, setForm, municipalities, barangays, totalPrice, depositAmount, onNext }) {
  const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const handleGuestChange = (delta) => {
    setForm(prev => {
      const current = parseInt(prev.guest_count || 0, 10);
      const next = Math.max(1, current + delta);
      return { ...prev, guest_count: next.toString() };
    });
  };


  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card className="flex-1 overflow-hidden border-border bg-card shadow-soft">
        <div className="border-b border-border bg-accent/5 p-6 md:p-8">
          <h2 className="mb-2 text-2xl font-bold text-foreground">Delivery Details</h2>
          <p className="text-sm text-muted-foreground">Where and when would you like the food delivered?</p>
        </div>

        <CardContent className="space-y-8 p-6 md:p-8">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-3 block">Estimated Guest Count (Pax) *</Label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleGuestChange(-10)}
                className="flex h-12 w-12 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Minus size={16} />
              </button>
              <Input
                type="number"
                min="1"
                value={form.guest_count}
                onChange={(e) => setForm({ ...form, guest_count: e.target.value })}
                className="h-12 w-28 text-center text-lg font-semibold"
                style={{ MozAppearance: 'textfield', appearance: 'textfield' }}
              />
              <button
                type="button"
                onClick={() => handleGuestChange(10)}
                className="flex h-12 w-12 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">How many people are you ordering food for?</p>
          </div>
          
          <hr className="border-border" />

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Delivery Method</h4>
            <div className="flex gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input 
                  type="radio" 
                  className="h-4 w-4 border-input text-primary focus:ring-primary" 
                  checked={form.delivery_method !== "pickup"}
                  onChange={() => setForm({ ...form, delivery_method: "delivery" })}
                />
                Deliver to this address
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <input 
                  type="radio" 
                  className="h-4 w-4 border-input text-primary focus:ring-primary" 
                  checked={form.delivery_method === "pickup"}
                  onChange={() => setForm({ ...form, delivery_method: "pickup" })}
                />
                Customer pickup
              </label>
            </div>
          </div>

          {form.delivery_method !== "pickup" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Input
                    type="text"
                    value={form.province}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Municipality</Label>
                  <select
                    className={inputClass}
                    value={form.municipality || ""}
                    onChange={(e) => setForm({ ...form, municipality: e.target.value, barangay: "" })}
                  >
                    <option value="" disabled>Select Municipality</option>
                    {municipalities.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Barangay</Label>
                  <select
                    className={inputClass}
                    value={form.barangay || ""}
                    onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                    disabled={!form.municipality}
                  >
                    <option value="" disabled>Select Barangay</option>
                    {barangays.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Street Name</Label>
                  <Input
                    type="text"
                    placeholder="Street name, building, house no."
                    value={form.street || ""}
                    onChange={(e) => setForm({ ...form, street: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Zip Code</Label>
                  <Input
                    type="text"
                    placeholder="Zip Code"
                    value={form.zip_code || ""}
                    onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Landmark</Label>
                  <Input
                    type="text"
                    placeholder="Near a landmark"
                    value={form.landmark || ""}
                    onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Delivery Instructions (Optional)</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Floor/unit number, gate color, parking notes, or access instructions"
                  value={form.delivery_instructions || ""}
                  onChange={(e) => setForm({ ...form, delivery_instructions: e.target.value })}
                ></textarea>
              </div>
            </div>
          )}
          {form.delivery_method === "pickup" && (
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-6 text-primary">
              <p className="mb-1 font-medium">Customer Pickup</p>
              <p className="text-sm opacity-90">You will pick up the food from our main kitchen on your selected event date and time.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <LiveEstimate form={form} totalPrice={totalPrice} depositAmount={depositAmount} onNext={onNext} />
    </div>
  );
}
