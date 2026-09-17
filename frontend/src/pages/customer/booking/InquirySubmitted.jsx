import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../../api/customer";
import { formatCurrency } from "../../../utils/format";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Home,
  Copy,
  Check,
  ShieldCheck,
  Receipt,
  Sparkles,
  Calendar,
  Users,
  MapPin,
  PartyPopper,
} from "lucide-react";

export default function InquirySubmitted() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [copied, setCopied] = useState(false);

  // Dev fallback data for immediate preview during local development if accessed directly
  const isDev = import.meta.env.DEV;
  const previewState = useMemo(() => {
    return isDev && !state?.submitted ? {
      submitted: true,
      kind: "package",
      reference: "INQ-000018",
      estimatedTotal: 20000,
      summary: [
        { label: "Celebrant / Honoree", value: "Veronica" },
        { label: "Event type", value: "Birthday" },
        { label: "Event date", value: "Sep 25, 2026" },
        { label: "Guests", value: "80" },
        { label: "Event space / scaffold size", value: "20 × 40" },
        { label: "Service", value: "Food and Event Setup" },
        { label: "Venue", value: "Garden" },
      ],
    } : null;
  }, [isDev, state?.submitted]);

  const activeState = state?.submitted ? state : previewState;

  const reference = activeState?.reference;
  const kind = activeState?.kind === "custom" ? "custom" : "package";
  const rawSummary = useMemo(() => {
    return Array.isArray(activeState?.summary) ? activeState.summary.filter((row) => row?.value) : [];
  }, [activeState]);
  const estimate = Number(activeState?.estimatedTotal) || 0;

  const [resolvedOfferName, setResolvedOfferName] = useState(activeState?.offerName || "");

  // Detect whether this inquiry represents a Special Offer
  const isSpecialOffer =
    activeState?.isSpecialOffer === true ||
    activeState?.kind === "special_offer" ||
    rawSummary.some((row) => row.label === "Service" && row.value === "Special Offer") ||
    rawSummary.some(
      (row) =>
        row.label === "Event type" &&
        (row.value === "Special Offer Catering" ||
          row.value === "Special Offer Event" ||
          row.value?.toLowerCase().includes("special offer"))
    );

  // If this is a Special Offer and we don't have the offer name yet, fetch it dynamically by reference
  useEffect(() => {
    if (!isSpecialOffer || resolvedOfferName || !reference) return;

    CustomerAPI.getInquiries()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        const match = list.find((inq) => inq.reference === reference);
        if (match) {
          const name = match.package_name_snapshot || match.package_id?.name || "";
          if (name) setResolvedOfferName(name);
        }
      })
      .catch(() => {});
  }, [isSpecialOffer, resolvedOfferName, reference]);

  const summary = useMemo(() => {
    if (!isSpecialOffer) return rawSummary;

    const eventDate = rawSummary.find((r) => r.label === "Event date")?.value || "";
    const guests = rawSummary.find((r) => r.label === "Guests")?.value || "";
    const dynamicOfferName =
      resolvedOfferName ||
      activeState?.offerName ||
      rawSummary.find((r) => r.label === "Service type")?.value ||
      "";

    return [
      { label: "Service", value: "Special Offer" },
      { label: "Service type", value: dynamicOfferName },
      { label: "Event date", value: eventDate },
      { label: "Guests", value: guests },
    ].filter((row) => Boolean(row?.value));
  }, [isSpecialOffer, rawSummary, resolvedOfferName, activeState?.offerName]);

  useEffect(() => {
    document.title = "Inquiry Submitted · Caezelle’s Food, Catering & Services";
  }, []);

  const handleCopy = () => {
    if (!reference) return;
    navigator.clipboard?.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If accessed directly without submission state in production, redirect to inquiries
  if (!activeState?.submitted) {
    return <Navigate to="/customer/inquiries" replace />;
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.25, 1, 0.5, 1] },
    },
  };

  const badgePopVariants = {
    hidden: { scale: 0.5, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 18 },
    },
  };

  // Helper icon for key-value rows
  const getRowIcon = (label) => {
    const l = label.toLowerCase();
    if (l.includes("date")) return <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    if (l.includes("guest")) return <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    if (l.includes("venue")) return <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    if (l.includes("celebrant") || l.includes("honoree") || l.includes("type"))
      return <PartyPopper className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    return null;
  };

  return (
    <CustomerLayout contentClassName="max-w-4xl mx-auto px-4 sm:px-6 py-2 sm:py-3 flex flex-col justify-center min-h-[calc(100vh-var(--ls-header-h,76px))] sm:max-h-[calc(100vh-var(--ls-header-h,76px))]">
      <Motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl sm:max-w-3xl mx-auto w-full flex flex-col gap-2.5 sm:gap-3"
      >
        {/* Header Milestone */}
        <Motion.div variants={itemVariants} className="text-center space-y-1">
          <Motion.div
            variants={badgePopVariants}
            className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-50/70 border border-emerald-200/60 shadow-2xs mb-0.5 relative"
          >
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.2} />
          </Motion.div>

          <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
            Inquiry Submitted
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-normal font-sans">
            {kind === "custom"
              ? "We've received your custom event request. Our team will review your specifications and prepare an official quotation."
              : "We've received your request! Our team will review your specifications and prepare an official quotation."}
          </p>

          {reference && (
            <div className="pt-0.5">
              <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-full px-3 py-0.5 text-xs text-slate-700 shadow-2xs font-sans">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  Reference
                </span>
                <span className="font-semibold text-slate-900 tracking-wide text-xs tabular-nums font-sans">
                  {reference}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-slate-400 hover:text-primary transition-colors p-0.5 rounded hover:bg-slate-200/60 flex items-center gap-1 cursor-pointer ml-0.5"
                  title="Copy Reference"
                >
                  {copied ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-[11px]">
                      <Check className="w-3 h-3" />
                      <span>Copied</span>
                    </span>
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          )}
        </Motion.div>

        {/* Assurance Ribbon */}
        <Motion.div
          variants={itemVariants}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50/90 border border-blue-200/70 text-blue-950 text-xs shadow-2xs font-sans"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <div className="leading-tight">
            <strong className="font-semibold text-blue-900">Zero Obligation Today:</strong>{" "}
            <span className="text-blue-800/90">
              Your date is secured once you review and accept the official quotation. No charges apply today.
            </span>
          </div>
        </Motion.div>

        {/* 2-Column Content Grid */}
        <Motion.div
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 items-stretch font-sans"
        >
          {/* Left Column: Request Summary */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3 sm:p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-sans">
                    What You Requested
                  </h2>
                </div>
                {summary.length > 0 && (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.2 rounded-full border border-slate-100">
                    {summary.length} items
                  </span>
                )}
              </div>

              {summary.length > 0 ? (
                <dl className="divide-y divide-slate-100/90 text-xs">
                  {summary.map((row) => (
                    <div key={row.label} className="py-1 flex justify-between items-center gap-3">
                      <dt className="text-slate-500 font-medium flex items-center gap-1.5">
                        {getRowIcon(row.label)}
                        <span>{row.label}</span>
                      </dt>
                      <dd className="text-slate-900 font-semibold text-right tabular-nums">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Inquiry details submitted to our team.
                </p>
              )}
            </div>

            {estimate > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200/90 bg-slate-50/70 -mx-3 -mb-3 sm:-mx-3.5 sm:-mb-3.5 p-2.5 rounded-b-xl">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Estimated Total
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Based on preliminary choices
                    </span>
                  </div>
                  <span className="text-sm sm:text-base font-bold text-primary tabular-nums tracking-tight font-sans">
                    {formatCurrency(estimate)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight border-t border-slate-200/60 pt-1">
                  *Official quotation may adjust based on final catering & add-ons.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Next Steps Timeline */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3 sm:p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-sans">
                    Next Steps Timeline
                  </h2>
                </div>
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded-full">
                  Step 2 of 4
                </span>
              </div>

              <div className="relative pl-5 space-y-2 my-1">
                {/* Vertical connecting line */}
                <div className="absolute left-2 top-1.5 bottom-1.5 w-0.5 bg-slate-200" />

                {/* Step 1 */}
                <div className="relative">
                  <span className="absolute -left-5 top-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white shadow-2xs">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 leading-tight">
                      Request Received
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.2 leading-tight">
                      Submitted and queued for our catering coordinators.
                    </p>
                  </div>
                </div>

                {/* Step 2 (Active) */}
                <div className="relative">
                  <span className="absolute -left-5 top-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white shadow-2xs ring-2 ring-primary/20">
                    <span className="text-[9px] font-bold">2</span>
                    {/* Pulsing indicator */}
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-white animate-pulse" />
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs font-bold text-primary leading-tight">
                        Review & Verification
                      </h3>
                      <span className="text-[9px] bg-primary/10 text-primary font-semibold px-1.5 py-0.2 rounded">
                        In Progress
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.2 leading-tight">
                      We check date availability, kitchen capacity, and menu choices.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <span className="absolute -left-5 top-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold">
                    3
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 leading-tight">
                      Official Quotation
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.2 leading-tight">
                      Receive an itemized quote with deposit instructions in your portal.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative">
                  <span className="absolute -left-5 top-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold">
                    4
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 leading-tight">
                      Confirm & Secure Date
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.2 leading-tight">
                      Accept quotation and submit deposit to confirm your event.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-accent" />
                Track status updates anytime
              </span>
              <Link
                to="/customer/inquiries"
                className="font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-0.5 transition-colors group"
              >
                <span>My Inquiries</span>
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </Motion.div>

        {/* Action Buttons */}
        <Motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-0.5 font-sans"
        >
          <button
            type="button"
            className="w-full sm:w-auto px-4 py-1.5 sm:py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            onClick={() => navigate("/")}
          >
            <Home className="w-3.5 h-3.5 text-slate-400" />
            Back to Home
          </button>

          <button
            type="button"
            className="w-full sm:w-auto px-5 py-1.5 sm:py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all hover:translate-y-[-0.5px] cursor-pointer group"
            onClick={() => navigate("/customer/inquiries")}
          >
            <span>Track in My Inquiries</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </Motion.div>
      </Motion.div>
    </CustomerLayout>
  );
}

