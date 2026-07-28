import { Plus, Minus } from "lucide-react";
import { BATANGAS_PROVINCE } from "../../../../utils/batangas";
import { Card, CardContent } from "../../../../components/ui/card";
import { Label } from "../../../../components/ui/label";
import { Input } from "../../../../components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const VENUE_TYPES = [
  "Covered Court",
  "Private Resort",
  "Function Hall",
  "Garden",
  "Beach",
  "Hotel Ballroom",
  "Restaurant",
  "Event Hall",
  "Other",
];

export default function StepEventDetails({
  form,
  setForm,
  initialEventType,
  municipalities,
  barangays,
  isCustomBooking,
  selectedPackageName,
  guestMin = 1, // default if not provided
  guestMax = 500, // default if not provided
}) {
  // Initialize guest count to guestMin if missing or out of range
  useEffect(() => {
    const current = Number(form.guest_count);
    if (!form.guest_count || current < guestMin || current > guestMax) {
      setForm((prev) => ({ ...prev, guest_count: guestMin.toString() }));
    }
  }, [guestMin, guestMax]);

  const handleGuestChange = (delta) => {
    setForm((prev) => {
      const current = parseInt(prev.guest_count || guestMin, 10);
      const next = Math.min(Math.max(current + delta, guestMin), guestMax);
      return { ...prev, guest_count: next.toString() };
    });
  };

  const handleGuestInput = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setForm((prev) => ({ ...prev, guest_count: "" }));
      return;
    }
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      const clamped = Math.min(Math.max(num, guestMin), guestMax);
      setForm((prev) => ({ ...prev, guest_count: clamped.toString() }));
    }
  };

  const inputClass =
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const isVenueTypeOther =
    form.venue_type && !VENUE_TYPES.includes(form.venue_type);

  const currentCount = parseInt(form.guest_count) || guestMin;

  return (
    <Card className="overflow-hidden border-border bg-card shadow-soft">
      <div className="border-b border-border p-6 md:p-8">
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Event Details
        </h2>
        <p className="text-sm text-muted-foreground">
          Tell us more about your event and requirements.
        </p>
      </div>

      <CardContent className="space-y-8 p-6 md:p-8">
        {!isCustomBooking && selectedPackageName && (
          <div className="rounded-lg bg-accent/10 p-4 text-sm">
            <span className="font-medium text-accent">Selected Package:</span>{" "}
            <span className="font-bold">{selectedPackageName}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Event Type *
            </Label>
            <select
              value={form.event_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  event_type: e.target.value,
                  event_type_other:
                    e.target.value === "Other" ? form.event_type_other : "",
                })
              }
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
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Event Theme / Motif
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="text"
                placeholder="e.g. Rustic, Navy Blue"
                value={form.event_theme}
                onChange={(e) =>
                  setForm({ ...form, event_theme: e.target.value })
                }
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter theme name and pick a primary color.
            </p>
          </div>
        </div>

        {form.event_type === "Other" && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Specify Event Type
            </Label>
            <Input
              type="text"
              placeholder="Anniversary, Christening, etc."
              value={form.event_type_other}
              onChange={(e) =>
                setForm({ ...form, event_type_other: e.target.value })
              }
              disabled={!!initialEventType}
            />
          </div>
        )}

        <div>
          <h3 className="mb-4 border-b border-border pb-2 text-sm font-semibold uppercase tracking-wider text-foreground">
            Venue Location
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Province
              </Label>
              <select
                disabled
                className={cn(
                  inputClass,
                  "bg-muted text-muted-foreground opacity-100",
                )}
              >
                <option>{BATANGAS_PROVINCE}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Municipality *
              </Label>
              <select
                value={form.municipality}
                onChange={(e) =>
                  setForm({
                    ...form,
                    municipality: e.target.value,
                    barangay: "",
                  })
                }
                className={inputClass}
              >
                <option value="">Select Municipality</option>
                {municipalities.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Barangay *
              </Label>
              <select
                value={form.barangay}
                disabled={!form.municipality}
                onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Barangay</option>
                {barangays.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Street / Details
              </Label>
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
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Venue Type
              </Label>
              <select
                value={isVenueTypeOther ? "Other" : form.venue_type}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "Other") {
                    setForm({ ...form, venue_type: "" });
                  } else {
                    setForm({ ...form, venue_type: value });
                  }
                }}
                className={inputClass}
              >
                <option value="">Select venue type</option>
                {VENUE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {isVenueTypeOther && (
                <Input
                  type="text"
                  placeholder="Enter custom venue type"
                  value={form.venue_type}
                  onChange={(e) =>
                    setForm({ ...form, venue_type: e.target.value })
                  }
                  className="mt-2"
                />
              )}
            </div>
          </div>
        </div>

        {/* Guest Count with Range Control */}
        <div className="grid grid-cols-1 gap-8 border-t border-border pt-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Estimated Guest Count *
              </Label>
              <span className="text-xs text-muted-foreground">
                {guestMin} – {guestMax} guests
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleGuestChange(-1)}
                disabled={currentCount <= guestMin}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors",
                  currentCount <= guestMin
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-muted hover:text-foreground",
                )}
              >
                <Minus size={16} />
              </button>
              <Input
                type="number"
                min={guestMin}
                max={guestMax}
                value={form.guest_count}
                onChange={handleGuestInput}
                className="h-12 w-28 text-center text-lg font-semibold"
                style={{ MozAppearance: "textfield", appearance: "textfield" }}
              />
              <button
                type="button"
                onClick={() => handleGuestChange(1)}
                disabled={currentCount >= guestMax}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors",
                  currentCount >= guestMax
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-muted hover:text-foreground",
                )}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Special Requests (Optional)
          </Label>
          <textarea
            placeholder="Any specific requests or additional information..."
            value={form.special_requests}
            onChange={(e) =>
              setForm({ ...form, special_requests: e.target.value })
            }
            rows="3"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </CardContent>
    </Card>
  );
}
