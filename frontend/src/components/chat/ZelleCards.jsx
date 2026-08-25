import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  CreditCard,
  ChevronRight,
  Package,
  Users,
  ArrowRight,
  FileText,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import useToast from "../../hooks/useToast";
import { cn } from "@/lib/utils";

/**
 * Modern Payment / Statement Generative UI Card
 */
export function PaymentSummaryCard({ data }) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const isUpToDate = data.is_up_to_date || data.payment_status === "Paid in Full" || data.status_badge === "UP TO DATE";
  const hasHistory = data.payment_history && data.payment_history.length > 0;

  const handleCopy = () => {
    const text = `iReserve Payment Summary:
Reference: ${data.booking_reference || "N/A"}
Event: ${data.event_type || "Catering Event"}
Total Contract: ${typeof data.total_price === "number" ? `₱${data.total_price.toLocaleString()}` : data.total_price}
Amount Paid: ${typeof data.total_paid === "number" ? `₱${data.total_paid.toLocaleString()}` : data.total_paid}
Remaining Balance: ${typeof data.remaining_balance === "number" ? `₱${data.remaining_balance.toLocaleString()}` : data.remaining_balance}
Status: ${data.payment_status || "Pending"}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    notify("Payment summary copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePayClick = () => {
    if (data.pay_url) {
      navigate(data.pay_url);
    } else if (data.booking_id) {
      navigate(`/customer/payments?booking_id=${data.booking_id}`);
    } else {
      navigate("/customer/payments");
    }
  };

  return (
    <div className="my-2.5 w-full max-w-md font-sans">
      {/* Main Card */}
      <div className="bg-white rounded-md border border-slate-200 shadow-2xs p-4 space-y-3.5 transition-all">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded bg-[#2C4B8A]/10 text-[#2C4B8A] flex items-center justify-center font-bold text-xs shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="font-mono font-bold text-xs text-slate-900 tracking-wide block truncate">
                {data.booking_reference ? `IRESERVE · ${data.booking_reference}` : "PAYMENT DETAILS"}
              </span>
            </div>
          </div>

          <span
            className={cn(
              "text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider rounded border flex items-center gap-1",
              isUpToDate
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-amber-50 text-amber-800 border-amber-200"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", isUpToDate ? "bg-emerald-500" : "bg-amber-500")} />
            {data.status_badge || (isUpToDate ? "UP TO DATE" : "PAYMENT DUE")}
          </span>
        </div>

        {/* Breakdown or History Rows */}
        {hasHistory ? (
          <div className="space-y-2 divide-y divide-slate-100 text-xs">
            {data.payment_history.slice(0, 3).map((item, idx) => (
              <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between">
                <span className="text-slate-500 font-medium">{item.date}</span>
                <div className="flex items-center gap-2 font-mono font-bold text-slate-900">
                  <span>{item.amount}</span>
                  <span className="text-[10px] text-emerald-600 font-sans font-semibold flex items-center gap-0.5">
                    ✓ {item.status || "POSTED"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-[11px] text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Contract: <strong className="font-semibold text-slate-900">{data.event_type || "Event"}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Event Date: <strong className="font-semibold text-slate-900">{data.event_date || "Upcoming"}</strong></span>
            </div>
          </div>
        )}

        {/* Total Summary Row */}
        <div className="pt-2.5 border-t border-slate-100 flex items-end justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {isUpToDate ? "TOTAL SETTLED" : "TOTAL AMOUNT DUE"}
            </span>
            <span className="text-[11px] text-slate-500">
              {isUpToDate ? "Fully cleared · 0 remaining" : `Balance: ₱${Number(data.remaining_balance || data.amount_due || 0).toLocaleString()}`}
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-lg text-[#2C4B8A]">
              ₱{Number(data.amount_due || data.total_price || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Primary Action Button */}
        {!isUpToDate && (
          <Button
            type="button"
            className="w-full h-9 text-xs font-semibold rounded-md bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            onClick={handlePayClick}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{data.pay_label || "Continue with Payment"}</span>
          </Button>
        )}

        {/* Document PDF Attachment Tile */}
        <div
          className="p-2.5 rounded-md bg-slate-50 hover:bg-slate-100/80 border border-slate-200 flex items-center justify-between gap-3 transition-colors cursor-pointer"
          onClick={() => navigate(data.booking_id ? `/customer/bookings` : `/customer/inquiries`)}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center shadow-2xs shrink-0">
              <FileText className="w-4 h-4 text-[#2C4B8A]" />
            </div>
            <div className="min-w-0">
              <h5 className="font-semibold text-xs text-slate-900 truncate">
                {data.statement_doc?.title || `Quotation_Statement_${data.booking_reference || "Doc"}.pdf`}
              </h5>
              <span className="text-[10px] text-[#2C4B8A] font-bold uppercase tracking-wider block mt-0.5">
                OPEN PREVIEW
              </span>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      </div>

      {/* Copy Action Below Card */}
      <button
        type="button"
        onClick={handleCopy}
        className="mt-1.5 text-[11px] text-slate-500 hover:text-slate-900 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copied ? "Copied!" : "Copy details"}</span>
      </button>
    </div>
  );
}

/**
 * Package Carousel Card
 */
export function PackageCarouselCard({ data, onSelectPackage }) {
  const navigate = useNavigate();
  if (!data?.packages || data.packages.length === 0) return null;

  return (
    <div className="my-2.5 w-full font-sans">
      <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-900">
        <Package className="w-3.5 h-3.5 text-[#2C4B8A]" />
        <span>{data.title || "Recommended Packages"}</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:thin] snap-x">
        {data.packages.map((pkg) => {
          const isCombo = pkg.offer_type === "special";
          const price =
            (isCombo ? pkg.price_per_pax : pkg.price_per_guest) ||
            pkg.setup_price ||
            "Inquire for quote";
          const guests = isCombo
            ? pkg.guest_count
              ? `Serves ${pkg.guest_count} guests`
              : ""
            : pkg.guest_capacity;

          return (
            <div
              key={pkg.id || pkg.name}
              className="snap-start shrink-0 w-60 p-3.5 rounded-md bg-white border border-slate-200 shadow-2xs hover:border-[#2C4B8A]/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{pkg.name}</h4>
                  {isCombo && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      Combo
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1 text-[#2C4B8A] font-bold text-xs mb-1">
                  <span>{price}</span>
                </div>
                {guests && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mb-2">
                    <Users className="w-3 h-3 shrink-0" />
                    <span>{guests}</span>
                  </p>
                )}
                {isCombo && pkg.food_items?.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {pkg.food_items.slice(0, 2).map((course, i) => (
                      <div key={i} className="text-[10px] text-slate-600 flex items-center gap-1 truncate">
                        <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                        <span className="truncate">{course.items?.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                )}
                {pkg.inclusions?.length > 0 && (
                  <div className="space-y-1 mb-2.5">
                    {pkg.inclusions.slice(0, 2).map((inc, i) => (
                      <div key={i} className="text-[10px] text-slate-600 flex items-center gap-1 truncate">
                        <span className="w-1 h-1 rounded-full bg-[#2C4B8A] shrink-0" />
                        <span className="truncate">{inc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                <Button
                  size="xs"
                  className="flex-1 text-[10px] h-7 rounded-md bg-[#2C4B8A] hover:bg-[#1E3563] text-white cursor-pointer shadow-2xs font-semibold"
                  onClick={() => onSelectPackage ? onSelectPackage(pkg.name) : navigate(`/packages/${pkg.id}`)}
                >
                  Inquire This
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  className="text-[10px] h-7 px-2 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-md cursor-pointer"
                  onClick={() => navigate(`/packages/${pkg.id}`)}
                >
                  Details <ChevronRight className="w-3 h-3 ml-0.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Date Availability Card
 */
export function DateAvailabilityCard({ data, onStartInquiry }) {
  if (!data) return null;
  const isAvailable = data.is_available && data.can_accept;

  return (
    <div className={cn(
      "my-2.5 p-3.5 rounded-md border shadow-2xs transition-all max-w-md font-sans",
      isAvailable 
        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" 
        : "bg-rose-50/70 border-rose-200 text-rose-950"
    )}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          {isAvailable ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <div>
            <h4 className="font-bold text-xs">{data.date ? new Date(data.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Target Date"}</h4>
            <p className="text-[10px] opacity-80">{isAvailable ? "Open & Available for Catering" : "Unavailable for Bookings"}</p>
          </div>
        </div>
        <span className={cn(
          "text-[10px] px-2 py-0.5 font-bold rounded border",
          isAvailable ? "bg-white border-emerald-300 text-emerald-800" : "bg-white border-rose-300 text-rose-800"
        )}>
          {isAvailable ? "Available" : "Blocked"}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed mb-2.5 opacity-90">{data.message}</p>

      {isAvailable && onStartInquiry && (
        <Button
          size="xs"
          className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs rounded-md cursor-pointer font-semibold"
          onClick={() => onStartInquiry(data.date)}
        >
          Book this Date with Zelle <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      )}
    </div>
  );
}

/**
 * Inquiry Confirmation Card
 */
export function InquiryConfirmationCard({ data }) {
  const navigate = useNavigate();
  if (!data) return null;

  return (
    <div className="my-2.5 p-3.5 rounded-md bg-slate-50 border border-slate-200 shadow-2xs text-slate-900 max-w-md font-sans">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded bg-[#2C4B8A]/10 text-[#2C4B8A] flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <div>
          <h4 className="font-sans font-bold text-xs text-slate-900">Inquiry Draft Submitted</h4>
          <p className="text-[10px] text-slate-500">Ref: <span className="font-mono font-bold text-[#2C4B8A]">{data.reference}</span></p>
        </div>
      </div>

      <div className="bg-white rounded-md p-2.5 border border-slate-200 text-xs space-y-1 my-2 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Event:</span>
          <span className="font-semibold text-slate-900">{data.event_type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Guests:</span>
          <span className="font-semibold text-slate-900">{data.guest_count} guests</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Date:</span>
          <span className="font-semibold text-slate-900">{data.event_date}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">Status:</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            {data.status || "Pending Review"}
          </span>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mb-2.5 leading-relaxed">
        Our catering coordinators have received your draft. They will review food &amp; setup availability and send an official Quotation to your portal soon.
      </p>

      <Button
        size="xs"
        className="w-full text-xs h-8 rounded-md bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-2xs cursor-pointer font-semibold"
        onClick={() => navigate("/customer/inquiries")}
      >
        Track in My Inquiries
      </Button>
    </div>
  );
}
