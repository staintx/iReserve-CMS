import {
  ShieldCheck,
  Calendar,
  MapPin,
  Info,
  Truck,
  Store,
  User,
  Phone,
  Clock,
  Users,
  Package,
  Tag,
} from "lucide-react";
import { SH } from "../components/BookingSharedUI";

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
      weekday: "long",
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

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <SH
        title="Review & Confirm"
        sub="Please review all details before proceeding to payment."
      />

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-sm space-y-8">
        {/* ============ EVENT DETAILS SECTION ============ */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1E293B] mb-5">
            <Calendar size={16} className="text-[#4C81E0]" />
            Event Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Package Name */}
            <div className="flex items-center gap-3 bg-[#F8FAFC]/50 rounded-lg px-4 py-3">
              <Package size={16} className="text-[#4C81E0] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">Package</p>
                <p className="text-sm font-semibold text-[#1E293B] truncate">
                  {initialPackageName || "Custom Package"}
                </p>
              </div>
            </div>

            {/* Event Type */}
            <div className="flex items-center gap-3 bg-[#F8FAFC]/50 rounded-lg px-4 py-3">
              <Tag size={16} className="text-[#4C81E0] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">Event Type</p>
                <p className="text-sm font-semibold text-[#1E293B]">
                  {form.event_type === "Other"
                    ? form.event_type_other
                    : form.event_type || "-"}
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3 bg-[#F8FAFC]/50 rounded-lg px-4 py-3">
              <Calendar size={16} className="text-[#4C81E0] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">Date</p>
                <p className="text-sm font-semibold text-[#1E293B]">
                  {formatDate(form.event_date)}
                </p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3 bg-[#F8FAFC]/50 rounded-lg px-4 py-3">
              <Clock size={16} className="text-[#4C81E0] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">Time</p>
                <p className="text-sm font-semibold text-[#1E293B]">
                  {formatTime(form.start_time)}
                </p>
              </div>
            </div>

            {/* Guests */}
            <div className="flex items-center gap-3 bg-[#F8FAFC]/50 rounded-lg px-4 py-3">
              <Users size={16} className="text-[#4C81E0] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">Guests</p>
                <p className="text-sm font-semibold text-[#1E293B]">
                  {guestCount} pax
                </p>
              </div>
            </div>

            {/* Delivery Method */}
            <div className="flex items-center gap-3 bg-[#F8FAFC]/50 rounded-lg px-4 py-3">
              {isDelivery ? (
                <Truck size={16} className="text-blue-600 flex-shrink-0" />
              ) : (
                <Store size={16} className="text-purple-600 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">Delivery Method</p>
                <p className="text-sm font-semibold text-[#1E293B]">
                  {isDelivery ? "Delivery" : "Pickup"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ LOCATION SECTION ============ */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1E293B] mb-5">
            <MapPin size={16} className="text-[#4C81E0]" />
            {isDelivery ? "Delivery Address" : "Pickup Location"}
          </h3>

          <div className="bg-[#F8FAFC]/50 rounded-lg p-5 space-y-3">
            {isDelivery ? (
              <>
                <div className="flex items-start gap-3">
                  <MapPin
                    size={16}
                    className="text-[#4C81E0] flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-xs text-[#64748B] mb-0.5">
                      Complete Address
                    </p>
                    <p className="text-sm font-semibold text-[#1E293B]">
                      {form.street && `${form.street}, `}
                      {form.barangay}, {form.municipality}, {form.province}
                    </p>
                  </div>
                </div>
                {form.landmark && (
                  <div className="flex items-start gap-3">
                    <MapPin
                      size={16}
                      className="text-[#4C81E0] flex-shrink-0 mt-0.5 opacity-0"
                    />
                    <div>
                      <p className="text-xs text-[#64748B] mb-0.5">Landmark</p>
                      <p className="text-sm font-semibold text-[#1E293B]">
                        {form.landmark}
                      </p>
                    </div>
                  </div>
                )}
                {form.venue_type && (
                  <div className="flex items-start gap-3">
                    <MapPin
                      size={16}
                      className="text-[#4C81E0] flex-shrink-0 mt-0.5 opacity-0"
                    />
                    <div>
                      <p className="text-xs text-[#64748B] mb-0.5">
                        Venue Type
                      </p>
                      <p className="text-sm font-semibold text-[#1E293B]">
                        {form.venue_type}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-3">
                <Store
                  size={16}
                  className="text-purple-600 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-xs text-[#64748B] mb-0.5">
                    Pickup Location
                  </p>
                  <p className="text-sm font-semibold text-[#1E293B]">
                    {pickupAddress || "Caterer's address"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============ CONTACT PERSON SECTION ============ */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1E293B] mb-5">
            <User size={16} className="text-[#4C81E0]" />
            Contact Person
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-[#F8FAFC]/50 rounded-lg px-4 py-3">
              <User size={16} className="text-[#4C81E0] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">Name</p>
                <p className="text-sm font-semibold text-[#1E293B] truncate">
                  {form.contact_first_name} {form.contact_last_name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#F8FAFC]/50 rounded-lg px-4 py-3">
              <Phone size={16} className="text-[#4C81E0] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">Phone</p>
                <p className="text-sm font-semibold text-[#1E293B]">
                  {form.contact_phone}
                </p>
              </div>
            </div>

            {form.contact_email && (
              <div className="flex items-center gap-3 bg-[#F8FAFC]/50 rounded-lg px-4 py-3 sm:col-span-2">
                <svg
                  className="w-4 h-4 text-[#4C81E0] flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <div className="min-w-0">
                  <p className="text-xs text-[#64748B]">Email</p>
                  <p className="text-sm font-semibold text-[#1E293B] truncate">
                    {form.contact_email}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ============ PRICING SECTION ============ */}
        <section>
          {/* Modification-aware summary: if original_total is provided, show additional/remaining amounts */}
          {form.original_total && Number(form.original_total) > 0 && (
            (() => {
              const originalTotal = Number(form.original_total || 0);
              const diff = totalPrice - originalTotal;
              if (diff > 0) {
                return (
                  <div className="rounded-2xl p-4 mb-4 border border-emerald-100 bg-emerald-50">
                    <p className="text-sm text-foreground font-semibold">Additional Payment Required</p>
                    <p className="text-lg font-bold text-foreground">₱{diff.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">This reflects the increase from your previous booking total.</p>
                  </div>
                );
              }
              if (diff < 0) {
                return (
                  <div className="rounded-2xl p-4 mb-4 border border-blue-100 bg-blue-50">
                    <p className="text-sm text-foreground font-semibold">Updated Remaining Balance</p>
                    <p className="text-lg font-bold text-foreground">₱{Math.abs(diff).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">This reflects the decrease in total; your remaining balance has been adjusted.</p>
                  </div>
                );
              }
              return null;
            })()
          )}
          {isDelivery ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl bg-[#1E293B] p-6 md:p-8 text-white shadow-md">
              <div className="text-center md:text-left">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#F8FAFC]/60">
                  Total Package Price
                </p>
                <p
                  className="text-3xl md:text-4xl text-[#F8FAFC]"
                  style={{ fontFamily: "Playfair Display, serif" }}
                >
                  ₱{totalPrice.toLocaleString()}
                </p>
              </div>

              <div className="hidden md:block h-16 w-px bg-white/10"></div>

              <div className="text-center md:text-right">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#4C81E0]">
                  Required Deposit (
                  {Math.round((depositAmount / totalPrice) * 100)}%)
                </p>
                <p
                  className="text-2xl md:text-3xl font-bold text-[#F8FAFC]"
                  style={{ fontFamily: "Playfair Display, serif" }}
                >
                  ₱{depositAmount.toLocaleString()}
                </p>
                <p className="mt-2 text-[10px] font-medium text-[#F8FAFC]/60 uppercase tracking-wider">
                  Secured payment via PayMongo
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#1E293B] p-6 md:p-8 text-white shadow-md text-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#F8FAFC]/60">
                Total Package Price
              </p>
              <p
                className="text-3xl md:text-4xl text-[#F8FAFC]"
                style={{ fontFamily: "Playfair Display, serif" }}
              >
                ₱{totalPrice.toLocaleString()}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-sm text-[#F8FAFC]/80">
                  Pay the full amount when you pick up your order
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ============ AGREEMENTS SECTION ============ */}
        <section>
          <div className="rounded-xl border border-[#4C81E0]/20 bg-[#4C81E0]/5 p-4 mb-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 flex-shrink-0 text-[#4C81E0] mt-0.5" />
              <p className="text-sm text-[#64748B] leading-relaxed">
                {isDelivery
                  ? "Please review our terms and privacy policy before continuing. By proceeding, you acknowledge that deposits are non-refundable."
                  : "Please review our terms and privacy policy before continuing. By proceeding, you agree to pay the full amount upon pickup."}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg hover:bg-[#F8FAFC]/30 transition-colors">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-[#CBD5E1] text-[#4C81E0] focus:ring-[#4C81E0] transition-colors cursor-pointer"
                checked={agreements.terms}
                onChange={(e) =>
                  setAgreements({ ...agreements, terms: e.target.checked })
                }
              />
              <span className="text-sm leading-relaxed text-[#64748B] group-hover:text-[#1E293B] transition-colors">
                I have read and agree to the{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTerms(true);
                  }}
                  className="font-semibold text-[#4C81E0] hover:underline"
                >
                  Terms & Conditions
                </button>
                {isDelivery && " including the non-refundable deposit policy."}
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group p-3 rounded-lg hover:bg-[#F8FAFC]/30 transition-colors">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 rounded border-[#CBD5E1] text-[#4C81E0] focus:ring-[#4C81E0] transition-colors cursor-pointer"
                checked={agreements.privacy}
                onChange={(e) =>
                  setAgreements({ ...agreements, privacy: e.target.checked })
                }
              />
              <span className="text-sm leading-relaxed text-[#64748B] group-hover:text-[#1E293B] transition-colors">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPrivacy(true);
                  }}
                  className="font-semibold text-[#4C81E0] hover:underline"
                >
                  Privacy Policy
                </button>{" "}
                and consent to the processing of my personal data.
              </span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
