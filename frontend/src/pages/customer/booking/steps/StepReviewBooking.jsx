import {
  Calendar,
  MapPin,
  Info,
  Truck,
  Store,
  User,
  Phone,
  Mail,
  Clock,
  Users,
  Package,
  Tag,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  SH,
  SectionTitle,
  InfoNote,
  StepShell,
  focusRing,
  formatPeso,
} from "../components/BookingSharedUI";
import { cn } from "@/lib/utils";

function Detail({ icon, label, value, className = "", iconClass = "" }) {
  const Icon = icon;
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl bg-[#F8FAFC] px-3 py-2",
        className,
      )}
    >
      <Icon size={15} className={cn("shrink-0 text-[#4C81E0]", iconClass)} />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">
          {label}
        </p>
        <p className="truncate text-[13px] font-semibold text-[#1E293B]">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

export default function StepReviewBooking({
  form,
  initialPackageName,
  pickupAddress,
  totalPrice,
  depositAmount,
  agreements,
  setAgreements,
  setShowTerms,
  setShowPrivacy,
}) {
  const guestCount = parseInt(form.guest_count || "0", 10);
  const isDelivery = form.delivery_method !== "pickup";

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "-";

    // Handle HH:MM format
    const [hours, minutes] = timeString.split(":").map(Number);

    if (isNaN(hours) || isNaN(minutes)) return timeString;

    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    const displayMinutes = minutes.toString().padStart(2, "0");

    return `${displayHours}:${displayMinutes} ${period}`;
  };

  const depositPercent =
    totalPrice > 0 ? Math.round((depositAmount / totalPrice) * 100) : 0;

  const fullAddress = [
    form.street,
    form.barangay,
    form.municipality,
    form.province,
  ]
    .filter(Boolean)
    .join(", ");

  const checkboxClass = cn(
    "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#CBD5E1] accent-[#4C81E0]",
    focusRing,
  );

  return (
    <StepShell>
      <SH
        title="Review & Confirm"
        sub="Check your details, then submit your inquiry — we'll reply with a quotation."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        {/* Summary */}
        <div className="flex flex-col gap-4">
          <Card className="p-4 sm:p-5">
            <SectionTitle icon={Calendar}>Event information</SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Detail
                icon={Package}
                label="Package"
                value={initialPackageName || "Custom Package"}
              />
              <Detail
                icon={Tag}
                label="Event Type"
                value={
                  form.event_type === "Other"
                    ? form.event_type_other
                    : form.event_type
                }
              />
              <Detail
                icon={Calendar}
                label="Date"
                value={formatDate(form.event_date)}
              />
              <Detail
                icon={Clock}
                label="Time"
                value={formatTime(form.start_time)}
              />
              <Detail icon={Users} label="Guests" value={`${guestCount} pax`} />
              <Detail
                icon={isDelivery ? Truck : Store}
                label="Fulfilment"
                value={isDelivery ? "Delivery" : "Pickup"}
              />
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionTitle icon={MapPin}>
              {isDelivery ? "Delivery address" : "Pickup location"}
            </SectionTitle>
            {isDelivery ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Detail
                  icon={MapPin}
                  label="Complete Address"
                  value={fullAddress}
                  className="sm:col-span-2"
                />
                {form.landmark && (
                  <Detail icon={MapPin} label="Landmark" value={form.landmark} />
                )}
                {form.venue_type && (
                  <Detail
                    icon={Store}
                    label="Venue Type"
                    value={form.venue_type}
                  />
                )}
              </div>
            ) : (
              <Detail
                icon={Store}
                label="Pickup Location"
                value={pickupAddress || "Caterer's address"}
              />
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <SectionTitle icon={User}>Contact person</SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Detail
                icon={User}
                label="Name"
                value={`${form.contact_first_name || ""} ${form.contact_last_name || ""}`.trim()}
              />
              <Detail icon={Phone} label="Phone" value={form.contact_phone} />
              {form.contact_email && (
                <Detail
                  icon={Mail}
                  label="Email"
                  value={form.contact_email}
                  className="sm:col-span-2"
                />
              )}
            </div>
          </Card>
        </div>

        {/* Pricing + agreements */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-[150px]">
          {/* Modification-aware summary: if original_total is provided, show additional/remaining amounts */}
          {form.original_total &&
            Number(form.original_total) > 0 &&
            (() => {
              const originalTotal = Number(form.original_total || 0);
              const diff = totalPrice - originalTotal;
              if (diff > 0) {
                return (
                  <InfoNote tone="success" title="Additional payment required">
                    <span className="block text-base font-bold text-emerald-900">
                      {formatPeso(diff)}
                    </span>
                    This reflects the increase from your previous booking total.
                  </InfoNote>
                );
              }
              if (diff < 0) {
                return (
                  <InfoNote tone="info" title="Updated remaining balance">
                    <span className="block text-base font-bold text-[#1E293B]">
                      {formatPeso(Math.abs(diff))}
                    </span>
                    This reflects the decrease in total; your remaining balance
                    has been adjusted.
                  </InfoNote>
                );
              }
              return null;
            })()}

          <div className="rounded-2xl bg-[#1E293B] p-5 text-white shadow-md">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
              Total package price
            </p>
            <p
              className="mt-0.5 text-3xl text-white"
              style={{ fontFamily: "Playfair Display, serif" }}
            >
              {formatPeso(totalPrice)}
            </p>

            {isDelivery ? (
              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8FB3F0]">
                  Required deposit ({depositPercent}%)
                </p>
                <p
                  className="mt-0.5 text-2xl font-bold text-white"
                  style={{ fontFamily: "Playfair Display, serif" }}
                >
                  {formatPeso(depositAmount)}
                </p>
                <p className="mt-1.5 text-[11px] uppercase tracking-wider text-white/50">
                  Payable after your quote is approved
                </p>
              </div>
            ) : (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                <span className="text-[13px] text-white/80">
                  Pay in full when you pick up your order
                </span>
              </div>
            )}
          </div>

          <Card className="p-4">
            <SectionTitle icon={ShieldCheck}>Agreements</SectionTitle>

            <InfoNote icon={Info} className="mb-3">
              {isDelivery
                ? "By proceeding, you acknowledge that deposits are non-refundable."
                : "By proceeding, you agree to pay the full amount upon pickup."}
            </InfoNote>

            <div className="space-y-2">
              <label className="group flex cursor-pointer items-start gap-2.5 rounded-xl p-2 transition-colors hover:bg-[#F8FAFC]">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={agreements.terms}
                  onChange={(e) =>
                    setAgreements({ ...agreements, terms: e.target.checked })
                  }
                />
                <span className="text-[13px] leading-relaxed text-[#64748B]">
                  I have read and agree to the{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowTerms(true);
                    }}
                    className={cn(
                      "rounded font-semibold text-[#4C81E0] hover:underline",
                      focusRing,
                    )}
                  >
                    Terms &amp; Conditions
                  </button>
                  {isDelivery && " including the non-refundable deposit policy."}
                </span>
              </label>

              <label className="group flex cursor-pointer items-start gap-2.5 rounded-xl p-2 transition-colors hover:bg-[#F8FAFC]">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={agreements.privacy}
                  onChange={(e) =>
                    setAgreements({ ...agreements, privacy: e.target.checked })
                  }
                />
                <span className="text-[13px] leading-relaxed text-[#64748B]">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowPrivacy(true);
                    }}
                    className={cn(
                      "rounded font-semibold text-[#4C81E0] hover:underline",
                      focusRing,
                    )}
                  >
                    Privacy Policy
                  </button>{" "}
                  and consent to the processing of my personal data.
                </span>
              </label>
            </div>
          </Card>
        </div>
      </div>
    </StepShell>
  );
}
