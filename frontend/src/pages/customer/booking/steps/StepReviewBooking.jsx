import { ShieldCheck, Calendar, MapPin, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function StepReviewBooking({ form, initialPackageName, initialPackagePrice, totalPrice, depositAmount, agreements, setAgreements, setShowTerms, setShowPrivacy }) {
  
  const guestCount = parseInt(form.guest_count || "0", 10);
  
  return (
    <Card className="overflow-hidden border-border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b border-border p-6 md:p-8">
        <div>
          <h2 className="mb-2 text-2xl font-bold text-foreground">Review & Confirm</h2>
          <p className="text-sm text-muted-foreground">Please review all details before proceeding to payment.</p>
        </div>
        <ShieldCheck className="h-12 w-12 text-emerald-500 opacity-20" />
      </div>

      <CardContent className="bg-muted/30 p-6 md:p-8">
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Event Summary Card */}
          <Card className="border-border/50 bg-background shadow-sm">
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                <Calendar size={14} className="text-accent" />
                Event Details
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Package</span>
                  <span className="font-medium text-foreground">{initialPackageName || "Custom Package"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event Type</span>
                  <span className="font-medium text-foreground">{form.event_type === "Other" ? form.event_type_other : form.event_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-foreground">
                    {form.event_date ? new Date(form.event_date).toLocaleDateString() : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium text-foreground">{form.start_time || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guests</span>
                  <span className="font-medium text-foreground">{guestCount} pax</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location & Contact Card */}
          <Card className="border-border/50 bg-background shadow-sm">
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                <MapPin size={14} className="text-accent" />
                Venue & Contact
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Venue Type</span>
                  <span className="font-medium text-foreground">{form.venue_type} ({form.indoor_outdoor})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="max-w-[200px] truncate text-right font-medium text-foreground" title={`${form.street}, ${form.barangay}, ${form.municipality}, ${form.province}`}>
                    {form.barangay}, {form.municipality}
                  </span>
                </div>
                <div className="mt-5 border-t border-border pt-4 flex justify-between">
                  <span className="text-muted-foreground">Contact Person</span>
                  <span className="font-medium text-foreground">{form.contact_first_name} {form.contact_last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium text-foreground">{form.contact_phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Total Cost Review */}
        <div className="mb-8 flex flex-col items-center justify-between gap-8 rounded-2xl bg-primary p-8 text-primary-foreground shadow-lift md:flex-row">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">Total Package Price</p>
            <p className="text-4xl text-primary-foreground">₱{totalPrice.toLocaleString()}</p>
          </div>
          <div className="hidden h-16 w-px bg-primary-foreground/10 md:block"></div>
          <div className="w-full text-right md:w-auto">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">Required Deposit</p>
            <p className="text-3xl font-bold text-primary-foreground">₱{depositAmount.toLocaleString()}</p>
            <p className="mt-2 text-xs font-medium text-primary-foreground/70">To be paid securely via PayMongo</p>
          </div>
        </div>

        {/* Agreements */}
        <Card className="border-border/50 bg-background shadow-sm">
          <CardContent className="p-6">
            <div className="mb-6 flex gap-4 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-foreground">
              <Info className="h-5 w-5 flex-shrink-0 text-accent" />
              <p>Please review our terms and privacy policy before continuing. By proceeding, you acknowledge that deposits are non-refundable.</p>
            </div>
            
            <div className="space-y-4 pl-1">
              <div className="flex items-start gap-4">
                <Checkbox
                  id="terms"
                  checked={agreements.terms}
                  onCheckedChange={(checked) => setAgreements({ ...agreements, terms: checked })}
                  className="mt-1"
                />
                <Label htmlFor="terms" className="text-sm leading-normal text-muted-foreground">
                  I have read and agree to the
                  <button type="button" onClick={() => setShowTerms(true)} className="mx-1 font-semibold text-accent transition-colors hover:text-accent/80">Terms & Conditions</button>
                  including the non-refundable deposit policy.
                </Label>
              </div>
              
              <div className="flex items-start gap-4">
                <Checkbox
                  id="privacy"
                  checked={agreements.privacy}
                  onCheckedChange={(checked) => setAgreements({ ...agreements, privacy: checked })}
                  className="mt-1"
                />
                <Label htmlFor="privacy" className="text-sm leading-normal text-muted-foreground">
                  I agree to the
                  <button type="button" onClick={() => setShowPrivacy(true)} className="mx-1 font-semibold text-accent transition-colors hover:text-accent/80">Privacy Policy</button>
                  and consent to the processing of my personal data.
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
