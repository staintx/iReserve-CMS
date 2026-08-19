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
 * Modern Payment / Statement Generative UI Card (eGov Agent Photo Style)
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
    <div className="my-3 w-full max-w-md">
      {/* Main Floating Card */}
      <div className="bg-card rounded-3xl border border-border/80 shadow-md p-5 space-y-4 transition-all">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="font-mono font-bold text-xs text-foreground tracking-wide block truncate">
                {data.booking_reference ? `IRESERVE · ${data.booking_reference}` : "PAYMENT DETAILS"}
              </span>
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider rounded-full flex items-center gap-1",
              isUpToDate
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", isUpToDate ? "bg-emerald-500" : "bg-amber-500")} />
            {data.status_badge || (isUpToDate ? "UP TO DATE" : "PAYMENT DUE")}
          </Badge>
        </div>

        {/* Breakdown or History Rows */}
        {hasHistory ? (
          <div className="space-y-2.5 divide-y divide-border/40 text-xs">
            {data.payment_history.slice(0, 3).map((item, idx) => (
              <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between">
                <span className="text-muted-foreground font-medium">{item.date}</span>
                <div className="flex items-center gap-2 font-mono font-bold text-foreground">
                  <span>{item.amount}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold flex items-center gap-0.5">
                    ✓ {item.status || "POSTED"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-[11px] text-foreground/90">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Catering Contract Verified: <strong className="font-semibold">{data.event_type || "Event"}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-foreground/90">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Target Event Date: <strong className="font-semibold">{data.event_date || "Upcoming"}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-foreground/90">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Secure Payment Channels: <strong className="font-semibold">GCash, Maya, Cards</strong></span>
            </div>
          </div>
        )}

        {/* Total Summary Row */}
        <div className="pt-3 border-t border-border/60 flex items-end justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              {isUpToDate ? "TOTAL SETTLED" : "TOTAL AMOUNT DUE"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {isUpToDate ? "Fully cleared · 0 remaining" : `Balance: ₱${Number(data.remaining_balance || data.amount_due || 0).toLocaleString()}`}
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono font-bold text-lg sm:text-xl text-primary">
              ₱{Number(data.amount_due || data.total_price || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Primary Action Button (Photo Style) */}
        {!isUpToDate && (
          <Button
            type="button"
            className="w-full h-11 text-xs sm:text-sm font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            onClick={handlePayClick}
          >
            <CreditCard className="w-4 h-4" />
            <span>{data.pay_label || "Continue with iReserve Pay"}</span>
          </Button>
        )}

        {/* Document PDF Attachment Tile (Photo Style) */}
        <div
          className="p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border/60 flex items-center justify-between gap-3 transition-colors cursor-pointer"
          onClick={() => navigate(data.booking_id ? `/customer/bookings` : `/customer/inquiries`)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-11 rounded-xl bg-card border border-border/80 flex flex-col items-center justify-center p-1 shadow-2xs shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-[8px] font-bold text-blue-600 uppercase mt-0.5">PDF</span>
            </div>
            <div className="min-w-0">
              <h5 className="font-medium text-xs text-foreground truncate">
                {data.statement_doc?.title || `Quotation_Statement_${data.booking_reference || "Doc"}.pdf`}
              </h5>
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider block mt-0.5">
                OPEN PREVIEW
              </span>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </div>
      </div>

      {/* Copy Action Below Card */}
      <button
        type="button"
        onClick={handleCopy}
        className="mt-2 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
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
    <div className="my-3 w-full">
      <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-foreground/90">
        <Package className="w-3.5 h-3.5 text-primary" />
        <span>{data.title || "Recommended Packages"}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 hide-scrollbar snap-x">
        {data.packages.map((pkg) => (
          <div
            key={pkg.id || pkg.name}
            className="snap-start shrink-0 w-64 p-4 rounded-3xl bg-card border border-border/80 shadow-md hover:border-primary/50 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-1 mb-1">
                <h4 className="font-serif font-bold text-xs text-foreground line-clamp-1">{pkg.name}</h4>
                {pkg.offer_type === "special" && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
                    Special Offer
                  </Badge>
                )}
              </div>
              <div className="flex items-baseline gap-1 text-primary font-bold text-sm mb-1.5">
                <span>{pkg.price_per_guest || pkg.setup_price || "Inquire for quote"}</span>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-2">
                <Users className="w-3 h-3 shrink-0" />
                <span>{pkg.guest_capacity}</span>
              </p>
              {pkg.inclusions?.length > 0 && (
                <div className="space-y-1 mb-3">
                  {pkg.inclusions.slice(0, 3).map((inc, i) => (
                    <div key={i} className="text-[10px] text-foreground/80 flex items-center gap-1 truncate">
                      <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                      <span className="truncate">{inc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 pt-2 border-t border-border/60">
              <Button
                size="xs"
                variant="outline"
                className="flex-1 text-[10px] h-8 rounded-xl cursor-pointer"
                onClick={() => onSelectPackage ? onSelectPackage(pkg.name) : navigate(`/packages/${pkg.id}`)}
              >
                Inquire This
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="text-[10px] h-8 px-2 text-primary hover:text-primary rounded-xl cursor-pointer"
                onClick={() => navigate(`/packages/${pkg.id}`)}
              >
                Details <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          </div>
        ))}
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
    <div className={`my-3 p-4 rounded-3xl border shadow-sm transition-all max-w-md ${
      isAvailable 
        ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-950 dark:text-emerald-200" 
        : "bg-rose-50/60 dark:bg-rose-950/20 border-rose-500/30 text-rose-950 dark:text-rose-200"
    }`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {isAvailable ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <div>
            <h4 className="font-bold text-xs">{data.date ? new Date(data.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "Target Date"}</h4>
            <p className="text-[10px] opacity-80">{isAvailable ? "🟢 Open & Available for Catering" : "🔴 Unavailable for Bookings"}</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] rounded-full ${isAvailable ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300" : "border-rose-500/40 text-rose-700 dark:text-rose-300"}`}>
          {isAvailable ? "Available" : "Blocked"}
        </Badge>
      </div>

      <p className="text-[11px] leading-relaxed mb-3 opacity-90">{data.message}</p>

      {isAvailable && onStartInquiry && (
        <Button
          size="xs"
          className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-xl cursor-pointer"
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
    <div className="my-3 p-4 rounded-3xl bg-primary/5 border border-primary/20 shadow-md text-foreground max-w-md">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-serif font-bold text-xs">Inquiry Draft Submitted!</h4>
          <p className="text-[10px] text-muted-foreground">Ref: <span className="font-mono font-bold text-primary">{data.reference}</span></p>
        </div>
      </div>

      <div className="bg-card/90 rounded-2xl p-3 border border-border/60 text-xs space-y-1.5 my-2.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Event:</span>
          <span className="font-semibold">{data.event_type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Guests:</span>
          <span className="font-semibold">{data.guest_count} guests</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Date:</span>
          <span className="font-semibold">{data.event_date}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Status:</span>
          <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">
            {data.status || "Pending Review"}
          </Badge>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
        Our catering coordinators have received your draft. They will review food & setup availability and send an official Quotation to your portal soon.
      </p>

      <Button
        size="xs"
        className="w-full text-xs h-8 rounded-xl bg-primary text-primary-foreground cursor-pointer"
        onClick={() => navigate("/customer/inquiries")}
      >
        Track in My Inquiries
      </Button>
    </div>
  );
}
