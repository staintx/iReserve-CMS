import { ShieldCheck, Calendar, MapPin, Info } from "lucide-react";
import { SH } from "../components/BookingSharedUI";

export default function StepReviewBooking({ form, initialPackageName, initialPackagePrice, totalPrice, depositAmount, agreements, setAgreements, setShowTerms, setShowPrivacy }) {
  
  const guestCount = parseInt(form.guest_count || "0", 10);
  
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <SH title="Review & Confirm" sub="Please review all details before proceeding to payment." />

      <div className="bg-white rounded-2xl border border-black/[0.08] p-6 sm:p-8 shadow-sm">
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Event Summary Card */}
          <div className="rounded-xl border border-black/10 bg-[#F7F4EE]/50 p-6">
            <h3 className="mb-4 flex items-center gap-2 border-b border-black/10 pb-3 text-xs font-bold uppercase tracking-wider text-[#111]">
              <Calendar size={14} className="text-[#D4AF37]" />
              Event Details
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B6657]">Package</span>
                <span className="font-semibold text-[#111]">{initialPackageName || "Custom Package"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6657]">Event Type</span>
                <span className="font-semibold text-[#111]">{form.event_type === "Other" ? form.event_type_other : form.event_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6657]">Date</span>
                <span className="font-semibold text-[#111]">
                  {formatDate(form.event_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6657]">Time</span>
                <span className="font-semibold text-[#111]">{form.start_time || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6657]">Guests</span>
                <span className="font-semibold text-[#111]">{guestCount} pax</span>
              </div>
            </div>
          </div>

          {/* Location & Contact Card */}
          <div className="rounded-xl border border-black/10 bg-[#F7F4EE]/50 p-6">
            <h3 className="mb-4 flex items-center gap-2 border-b border-black/10 pb-3 text-xs font-bold uppercase tracking-wider text-[#111]">
              <MapPin size={14} className="text-[#D4AF37]" />
              Venue & Contact
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#6B6657]">Venue Type</span>
                <span className="font-semibold text-[#111]">{form.venue_type} {form.indoor_outdoor ? `(${form.indoor_outdoor})` : ""}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6657]">Location</span>
                <span className="max-w-[180px] truncate text-right font-semibold text-[#111]" title={`${form.street || ""}, ${form.barangay || ""}, ${form.municipality || ""}, ${form.province || ""}`}>
                  {form.barangay}, {form.municipality}
                </span>
              </div>
              <div className="mt-5 border-t border-black/10 pt-4 flex justify-between">
                <span className="text-[#6B6657]">Contact Person</span>
                <span className="font-semibold text-[#111]">{form.contact_first_name} {form.contact_last_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B6657]">Phone</span>
                <span className="font-semibold text-[#111]">{form.contact_phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Cost Review */}
        <div className="mb-8 flex flex-col items-center justify-between gap-8 rounded-2xl bg-[#111] p-8 text-white shadow-md md:flex-row">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#F7F4EE]/70">Total Package Price</p>
            <p className="text-4xl text-[#F7F4EE]" style={{ fontFamily: "Playfair Display, serif" }}>₱{totalPrice.toLocaleString()}</p>
          </div>
          <div className="hidden h-16 w-px bg-white/10 md:block"></div>
          <div className="w-full text-right md:w-auto">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">Required Deposit</p>
            <p className="text-3xl font-bold text-[#F7F4EE]" style={{ fontFamily: "Playfair Display, serif" }}>₱{depositAmount.toLocaleString()}</p>
            <p className="mt-2 text-[10px] font-medium text-[#F7F4EE]/70 uppercase tracking-wider">To be paid securely via PayMongo</p>
          </div>
        </div>

        {/* Agreements */}
        <div className="rounded-xl border border-black/10 bg-white p-6">
          <div className="mb-6 flex gap-4 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4 text-sm text-[#111]">
            <Info className="h-5 w-5 flex-shrink-0 text-[#D4AF37]" />
            <p className="text-xs text-[#6B6657] leading-relaxed">Please review our terms and privacy policy before continuing. By proceeding, you acknowledge that deposits are non-refundable.</p>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-start gap-4 cursor-pointer group">
              <input 
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-black/20 text-[#D4AF37] focus:ring-[#D4AF37] transition-colors"
                checked={agreements.terms}
                onChange={(e) => setAgreements({ ...agreements, terms: e.target.checked })}
              />
              <span className="text-sm leading-relaxed text-[#6B6657] group-hover:text-[#111] transition-colors">
                I have read and agree to the
                <button type="button" onClick={(e) => { e.preventDefault(); setShowTerms(true); }} className="mx-1 font-semibold text-[#D4AF37] hover:underline">Terms & Conditions</button>
                including the non-refundable deposit policy.
              </span>
            </label>
            
            <label className="flex items-start gap-4 cursor-pointer group">
              <input 
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-black/20 text-[#D4AF37] focus:ring-[#D4AF37] transition-colors"
                checked={agreements.privacy}
                onChange={(e) => setAgreements({ ...agreements, privacy: e.target.checked })}
              />
              <span className="text-sm leading-relaxed text-[#6B6657] group-hover:text-[#111] transition-colors">
                I agree to the
                <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }} className="mx-1 font-semibold text-[#D4AF37] hover:underline">Privacy Policy</button>
                and consent to the processing of my personal data.
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
