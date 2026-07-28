import { Plus, Minus } from "lucide-react";
import { BATANGAS_PROVINCE } from "../../../../utils/batangas";
import { Card, CardContent } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import { Input } from "../../../../components/ui/input";
import { cn } from "@/lib/utils";

export default function StepEventDetails({ form, setForm, initialEventType, municipalities, barangays }) {

  const handleGuestChange = (delta) => {
    setForm(prev => {
      const current = parseInt(prev.guest_count || 0, 10);
      const next = Math.max(1, current + delta);
      return { ...prev, guest_count: next.toString() };
    });
  };



  const inputClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Card className="overflow-hidden border-border bg-card shadow-soft">
      <div className="border-b border-border p-6 md:p-8">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Event Details</h2>
        <p className="text-sm text-muted-foreground">Tell us more about your event and requirements.</p>
      </div>

      <CardContent className="space-y-8 p-6 md:p-8">
        {/* Basic Details Row */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Event Type *</Label>
            <select
              value={form.event_type}
              onChange={(e) => setForm({
                ...form,
                event_type: e.target.value,
                event_type_other: e.target.value === "Other" ? form.event_type_other : ""
              })}
              disabled={!!initialEventType}
              className={inputClass}
            >
              <option value="">Select event type</option>
              <option value="Birthday">Birthday</option>
              <option value="Wedding">Wedding</option>
              <option value="Corporate">Corporate</option>
              <option value="Other">Others (please specify)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Event Theme / Motif</Label>
            <Input
              type="text"
              placeholder="e.g. Rustic, Navy Blue"
              value={form.event_theme}
              onChange={(e) => setForm({ ...form, event_theme: e.target.value })}
            />
          </div>
        </div>

        {form.event_type === "Other" && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Specify Event Type</Label>
            <Input
              type="text"
              placeholder="Anniversary, Christening, etc."
              value={form.event_type_other}
              onChange={(e) => setForm({ ...form, event_type_other: e.target.value })}
              disabled={!!initialEventType}
            />
          </div>
        )}

        {/* Venue Location Row */}
        <div>
          <h3 className="mb-4 border-b border-border pb-2 text-sm font-semibold uppercase tracking-wider text-foreground">Venue Location</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Province</Label>
              <select disabled className={cn(inputClass, "bg-muted text-muted-foreground opacity-100")}>
                <option>{BATANGAS_PROVINCE}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Municipality *</Label>
              <select
                value={form.municipality}
                onChange={(e) => setForm({ ...form, municipality: e.target.value, barangay: "" })}
                className={inputClass}
              >
                <option value="">Select Municipality</option>
                {municipalities.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Barangay *</Label>
              <select
                value={form.barangay}
                disabled={!form.municipality}
                onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Barangay</option>
                {barangays.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Street / Details</Label>
              <Input
                type="text"
                placeholder="Purok 4, Near 7/11"
                value={form.street}
                onChange={(e) => setForm({ ...form, street: e.target.value })}
              />
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
             <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Venue Type</Label>
              <Input
                type="text"
                placeholder="e.g. Covered Court, Private Resort"
                value={form.venue_type}
                onChange={(e) => setForm({ ...form, venue_type: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Setting</Label>
              <div className="mt-3 flex gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="venue_setting"
                    checked={form.indoor_outdoor === "Indoor"}
                    onChange={() => setForm({ ...form, indoor_outdoor: "Indoor" })}
                    className="h-4 w-4 border-input text-primary focus:ring-primary"
                  />
                  Indoor
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="venue_setting"
                    checked={form.indoor_outdoor === "Outdoor"}
                    onChange={() => setForm({ ...form, indoor_outdoor: "Outdoor" })}
                    className="h-4 w-4 border-input text-primary focus:ring-primary"
                  />
                  Outdoor
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements Row */}
        <div className="grid grid-cols-1 gap-8 border-t border-border pt-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Estimated Guest Count *</Label>
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
                style={{ MozAppearance: 'textfield', appearance: 'textfield' }} // hide spinners
              />
              <button
                type="button"
                onClick={() => handleGuestChange(10)}
                className="flex h-12 w-12 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>


        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Special Requests (Optional)</Label>
          <textarea
            placeholder="Any specific requests or additional information..."
            value={form.special_requests}
            onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
            rows="3"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

      </CardContent>
    </Card>
  );
}
