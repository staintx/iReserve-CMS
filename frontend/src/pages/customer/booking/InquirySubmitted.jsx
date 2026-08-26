import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import CustomerLayout from "../../../components/layout/CustomerLayout";
import { formatCurrency } from "../../../utils/format";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  Home,
  Copy,
  Check,
  AlertCircle,
  Receipt,
  FileCheck,
} from "lucide-react";

export default function InquirySubmitted() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [copied, setCopied] = useState(false);

  const reference = state?.reference;
  const kind = state?.kind === "custom" ? "custom" : "package";
  const summary = Array.isArray(state?.summary) ? state.summary.filter((row) => row?.value) : [];
  const estimate = Number(state?.estimatedTotal) || 0;

  useEffect(() => {
    document.title = "Inquiry Submitted · Caezelle's Catering";
  }, []);

  const handleCopy = () => {
    if (!reference) return;
    navigator.clipboard?.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If accessed directly without submission state, redirect to inquiries
  if (!state?.submitted) {
    return <Navigate to="/customer/inquiries" replace />;
  }

  return (
    <CustomerLayout contentClassName="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-3.5">
        {/* Header Milestone */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 ring-6 ring-emerald-50/60 mb-0.5">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
            Inquiry Submitted
          </h1>
          {/* What happens to the customer next, before anything about what the
              system did. The first thing they want to know after sending a form
              is who contacts them and how — not that a record was created. The
              price is deliberately not spoken for here: it is settled on the
              quotation, which is what this paragraph says. */}
          <p className="text-xs sm:text-sm text-slate-700 max-w-lg mx-auto">
            Our caterer will contact you using the information you provided
            during the booking process to discuss your request and prepare your
            quotation.
          </p>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            {kind === "custom"
              ? "We've received your custom event request. Our catering team will prepare a tailored quotation for you."
              : "We've received your request! Our team will review your specifications and prepare an official quotation."}
          </p>

          {reference && (
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-full px-3 py-0.5 text-xs text-slate-700 font-medium mt-1">
              <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">Reference</span>
              <span className="font-mono font-bold text-slate-900">{reference}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-slate-400 hover:text-slate-700 transition-colors ml-0.5 p-0.5 rounded"
                title="Copy Reference"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Notice Banner */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-amber-50/90 border border-amber-200/70 text-amber-950 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong className="font-semibold">Draft Request:</strong> Your date is secured once you review and accept the official quotation. No charges apply today.
          </span>
        </div>

        {/* 2-Column Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
          {/* Left Column: Request Summary */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100">
                <Receipt className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">What You Requested</h2>
              </div>

              {summary.length > 0 ? (
                <dl className="divide-y divide-slate-100 text-xs">
                  {summary.map((row) => (
                    <div key={row.label} className="py-1.5 flex justify-between items-center gap-4">
                      <dt className="text-slate-500 font-medium">{row.label}</dt>
                      <dd className="text-slate-900 font-semibold text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-xs text-slate-500 py-3 text-center">Inquiry details submitted to our team.</p>
              )}
            </div>

            {estimate > 0 && (
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 bg-slate-50/70 -mx-4 -mb-4 p-3 rounded-b-lg">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-800">Estimated Total</span>
                  <span className="text-sm sm:text-base font-bold text-primary font-mono">{formatCurrency(estimate)}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                  *Estimated based on current selections; official quotation may adjust based on final catering & add-ons.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Next Steps */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-2xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-100">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Next Steps Timeline</h2>
              </div>

              <ol className="relative pl-5 border-l border-slate-200 space-y-2.5 my-1 text-xs">
                <li className="relative">
                  <span className="absolute -left-[25px] top-0 flex items-center justify-center w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                    ✓
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 leading-tight">Request Received</h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Submitted and queued for our catering coordinators.</p>
                </li>

                <li className="relative">
                  <span className="absolute -left-[25px] top-0 flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold ring-2 ring-primary/20">
                    2
                  </span>
                  <h3 className="text-xs font-bold text-primary flex items-center gap-1.5 leading-tight">
                    Review & Verification
                    <span className="text-[9px] bg-primary/10 text-primary font-semibold px-1.5 py-0.2 rounded">In Progress</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">We check date availability, kitchen capacity, and menu choices.</p>
                </li>

                <li className="relative">
                  <span className="absolute -left-[25px] top-0 flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold">
                    3
                  </span>
                  <h3 className="text-xs font-bold text-slate-700 leading-tight">Official Quotation</h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Receive an itemized quote with deposit instructions in your portal.</p>
                </li>

                <li className="relative">
                  <span className="absolute -left-[25px] top-0 flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[9px] font-bold">
                    4
                  </span>
                  <h3 className="text-xs font-bold text-slate-700 leading-tight">Confirm & Secure Date</h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Accept quotation and submit deposit to confirm your event.</p>
                </li>
              </ol>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
              📍 Track updates anytime in{" "}
              <Link to="/customer/inquiries" className="font-semibold text-primary hover:underline">
                My Inquiries
              </Link>
              .
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-0.5">
          <button
            type="button"
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            onClick={() => navigate("/")}
          >
            <Home className="w-3.5 h-3.5 text-slate-400" />
            Back to Home
          </button>

          <button
            type="button"
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all hover:translate-y-[-0.5px] cursor-pointer"
            onClick={() => navigate("/customer/inquiries")}
          >
            Track in My Inquiries
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </CustomerLayout>
  );
}
