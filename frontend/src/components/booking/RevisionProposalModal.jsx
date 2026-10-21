import React, { useState } from "react";
import Modal from "../common/Modal";
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  MapPin, 
  Sparkles,
  RefreshCw,
  Edit,
  MessageSquare,
  Ruler
} from "lucide-react";

const fmtCurrency = (val) => {
  return "₱" + Number(val || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function RevisionProposalModal({ 
  open, 
  onClose, 
  booking, 
  onAccept, 
  onReject, 
  onCounterPropose,
  isCustomer = true 
}) {
  const [activeTab, setActiveTab] = useState("view"); // "view" | "reject" | "counter"
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  // Counter proposal form fields
  const [counterNote, setCounterNote] = useState("");
  const [counterDate, setCounterDate] = useState("");
  const [counterTime, setCounterTime] = useState("");
  const [counterGuests, setCounterGuests] = useState("");
  const [counterVenue, setCounterVenue] = useState("");
  const [counterRequests, setCounterRequests] = useState("");

  if (!booking || !booking.pending_revision) return null;

  const proposal = booking.pending_revision;
  const snapshot = proposal.proposed_snapshot || {};

  const handleConfirmAccept = async () => {
    setLoading(true);
    try {
      await onAccept();
      onClose();
    } catch (err) {
      // handled by parent toast
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    setLoading(true);
    try {
      await onReject(rejectReason);
      setActiveTab("view");
      setRejectReason("");
      onClose();
    } catch (err) {
      // handled by parent toast
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCounter = async (e) => {
    e.preventDefault();
    if (!counterNote.trim()) return;

    setLoading(true);
    try {
      const payload = {
        message: counterNote.trim(),
        ...(counterDate ? { event_date: counterDate } : {}),
        ...(counterTime ? { start_time: counterTime } : {}),
        ...(counterGuests ? { guest_count: Number(counterGuests) } : {}),
        ...(counterVenue ? { venue_type: counterVenue } : {}),
        ...(counterRequests ? { special_requests: counterRequests } : {}),
      };

      if (onCounterPropose) {
        await onCounterPropose(payload);
      }
      setActiveTab("view");
      setCounterNote("");
      onClose();
    } catch (err) {
      // handled by parent toast
    } finally {
      setLoading(false);
    }
  };

  const formattedCurrentDate = booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A";
  const formattedProposedDate = snapshot.event_date ? new Date(snapshot.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : formattedCurrentDate;

  const currentPrice = Number(booking.total_price || 0);
  const proposedPrice = snapshot.total_price !== undefined ? Number(snapshot.total_price) : currentPrice;
  const priceDiff = proposedPrice - currentPrice;

  const currentScaffold = (booking.scaffold_width && booking.scaffold_length) ? `${booking.scaffold_width}x${booking.scaffold_length} ft` : null;
  const proposedScaffold = (snapshot.scaffold_width && snapshot.scaffold_length) ? `${snapshot.scaffold_width}x${snapshot.scaffold_length} ft` : currentScaffold;

  const ocularNotes = snapshot.ocular_notes || (booking.ocular_visit?.outcome === "revise" ? booking.ocular_visit?.notes : null);
  const setupNotes = snapshot.custom_setup_notes || snapshot.special_requests;
  const isOcularRevision = Boolean(snapshot.is_ocular || ocularNotes || booking.ocular_visit?.outcome === "revise");

  const handleOpenChange = (val) => {
    if (!val) {
      setActiveTab("view");
      setRejectReason("");
    }
    if (typeof onClose === "function") {
      onClose(val);
    }
  };

  const footerActions = (
    <div className="flex items-center justify-between w-full gap-2">
      {activeTab === "reject" ? (
        <>
          <button
            type="button"
            onClick={() => setActiveTab("view")}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirmReject}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            <span>Confirm Decline</span>
          </button>
        </>
      ) : activeTab === "counter" ? (
        <>
          <button
            type="button"
            onClick={() => setActiveTab("view")}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirmCounter}
            disabled={loading || !counterNote.trim()}
            className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#2C4B8A] hover:bg-[#233C6F] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-[#D2B67C]" />}
            <span>Submit Counter-Proposal</span>
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setActiveTab("reject")}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4 text-rose-500" />
            <span>Decline</span>
          </button>

          <div className="flex items-center gap-2">
            {onCounterPropose && isCustomer && (
              <button
                type="button"
                onClick={() => {
                  setCounterDate(snapshot.event_date ? new Date(snapshot.event_date).toISOString().split("T")[0] : "");
                  setCounterTime(snapshot.start_time || "");
                  setCounterGuests(snapshot.guest_count || "");
                  setCounterVenue(snapshot.venue_type || "");
                  setCounterRequests(snapshot.special_requests || "");
                  setActiveTab("counter");
                }}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Edit className="w-4 h-4 text-slate-500" />
                <span>Request Changes</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirmAccept}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[#2C4B8A] hover:bg-[#233C6F] text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 text-[#D2B67C]" />}
              <span>Accept &amp; Confirm</span>
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={() => handleOpenChange(false)}
      title={
        activeTab === "counter"
          ? "Request Adjustments / Counter-Propose"
          : activeTab === "reject"
            ? "Decline Revision Proposal"
            : ocularNotes
              ? "Site Inspection Revision Proposal"
              : "Revised Booking Proposal"
      }
      description={
        activeTab === "counter"
          ? "Provide your feedback and preferred adjustments for catering management to review."
          : activeTab === "reject"
            ? "Active booking terms will remain unchanged. You may provide a reason below."
            : `Proposed by ${proposal.proposed_by === "admin" ? "Catering Manager" : "Customer"} on ${proposal.requested_at ? new Date(proposal.requested_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}`
      }
      icon={activeTab === "counter" ? Edit : activeTab === "reject" ? XCircle : Sparkles}
      badge={
        <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2.5 py-0.5 rounded-full border border-slate-200">
          {booking.reference || `BK-${booking._id.substring(booking._id.length - 6).toUpperCase()}`}
        </span>
      }
      className="max-w-2xl"
      footer={footerActions}
    >
      <div className="space-y-4 py-1">
        {activeTab === "view" && (
          <>
            {/* Prominent Admin Revision Note */}
            {proposal.message && (
              <div className="rounded-xl bg-[#2C4B8A]/5 border border-[#2C4B8A]/15 p-3.5 flex items-start gap-3 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-[#2C4B8A]/10 text-[#2C4B8A] border border-[#2C4B8A]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare size={15} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C4B8A] block">
                    {proposal.proposed_by === "admin" ? "Message from Catering Management" : "Proposal Note"}
                  </span>
                  <p className="text-xs sm:text-[13px] text-slate-800 leading-relaxed font-medium mt-0.5 italic">
                    "{proposal.message}"
                  </p>
                </div>
              </div>
            )}

            {/* Ocular Site Inspection Findings Card */}
            {ocularNotes && (
              <div className="rounded-xl bg-[#FBF8F2] border border-[#E8D4A8] p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-[#5C402B] font-bold text-xs uppercase tracking-wider">
                  <Ruler size={15} className="text-[#B8994E] shrink-0" />
                  <span>Ocular Site Inspection Findings &amp; Measurements</span>
                </div>
                <p className="text-xs sm:text-[13px] text-[#5C402B]/90 leading-relaxed font-medium whitespace-pre-line pl-6">
                  {ocularNotes}
                </p>
                {setupNotes && (
                  <div className="pl-6 pt-1 text-xs text-[#7B583C] font-medium flex items-center gap-1.5">
                    <span className="font-bold">Setup &amp; Equipment Notes:</span>
                    <span>{setupNotes}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Terms Comparison (Current vs. Proposed)
                </span>
                <span className="text-[11px] text-slate-400">
                  Review changes below
                </span>
              </div>

              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                
                {/* Current Terms */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Current Active Terms</span>
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Active</span>
                  </div>

                  <div className="space-y-2 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date
                      </span>
                      <span className="font-semibold text-slate-800">{formattedCurrentDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Time
                      </span>
                      <span className="font-semibold text-slate-800">{booking.start_time || "TBA"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> Headcount
                      </span>
                      <span className="font-semibold text-slate-800">{booking.guest_count || 0} pax</span>
                    </div>
                    {currentScaffold && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Ruler className="w-3.5 h-3.5 text-slate-400" /> Space
                        </span>
                        <span className="font-semibold text-slate-800">{currentScaffold}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> Venue
                      </span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">{booking.venue_type || "Standard Venue"}</span>
                    </div>

                    <div className="pt-2.5 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Total Price</span>
                        <span className="text-slate-900 font-mono font-bold text-base">{fmtCurrency(currentPrice)}</span>
                      </div>
                      {isOcularRevision && snapshot.package_price != null && (
                        <div className="mt-2 rounded-lg bg-white/90 border border-slate-200/80 p-2 text-[11px] space-y-1">
                          <div className="flex justify-between text-slate-600">
                            <span>Original Package Setup:</span>
                            <span className="font-mono font-medium text-slate-800">
                              {fmtCurrency(booking.package_price || booking.package_starting_price || (currentPrice - (proposedPrice - Number(snapshot.package_price || 0))))}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Food Catering (Preserved):</span>
                            <span className="font-mono font-medium text-slate-700">
                              {fmtCurrency(Math.max(0, proposedPrice - Number(snapshot.package_price || 0)))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Proposed Terms */}
                <div className="rounded-xl border-2 border-[#2C4B8A]/30 bg-gradient-to-b from-[#2C4B8A]/5 via-white to-transparent p-4 space-y-2.5 shadow-2xs relative">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2C4B8A]/20">
                    <span className="font-bold text-[#2C4B8A] uppercase tracking-wider text-[11px]">Proposed Revision</span>
                    <span className="bg-[#2C4B8A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-2xs">Proposed</span>
                  </div>

                  <div className="space-y-2 text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-[#2C4B8A]" /> Date
                      </span>
                      <span className={`font-semibold ${!isOcularRevision && formattedProposedDate !== formattedCurrentDate ? "text-[#2C4B8A] font-bold" : "text-slate-800"}`}>
                        {formattedProposedDate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-[#2C4B8A]" /> Time
                      </span>
                      <span className={`font-semibold ${!isOcularRevision && snapshot.start_time && snapshot.start_time !== booking.start_time ? "text-[#2C4B8A] font-bold" : "text-slate-800"}`}>
                        {(!isOcularRevision && snapshot.start_time) || booking.start_time || "TBA"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Users className="w-3.5 h-3.5 text-[#2C4B8A]" /> Headcount
                      </span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        {(isOcularRevision ? booking.guest_count : (snapshot.guest_count ?? booking.guest_count)) || 0} pax
                        {isOcularRevision && <span className="text-[10px] text-amber-800 font-medium bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">Preserved</span>}
                      </span>
                    </div>
                    {proposedScaffold && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Ruler className="w-3.5 h-3.5 text-[#2C4B8A]" /> Space
                        </span>
                        <span className="font-bold text-[#2C4B8A] flex items-center gap-1">
                          {proposedScaffold}
                          <span className="text-[10px] font-medium bg-[#2C4B8A]/10 px-1.5 py-0.2 rounded">Adjusted</span>
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-[#2C4B8A]" /> Venue
                      </span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">{snapshot.venue_type || booking.venue_type || "Standard Venue"}</span>
                    </div>

                    <div className="pt-2.5 border-t border-[#2C4B8A]/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#2C4B8A] uppercase tracking-wider">Total Price</span>
                        <span className="text-[#2C4B8A] font-mono font-bold text-base">{fmtCurrency(proposedPrice)}</span>
                      </div>
                      {isOcularRevision && snapshot.package_price != null && (
                        <div className="mt-2 rounded-lg bg-white/90 border border-[#2C4B8A]/20 p-2 text-[11px] space-y-1">
                          <div className="flex justify-between text-[#2C4B8A]">
                            <span>Adjusted Package Setup:</span>
                            <span className="font-mono font-bold">{fmtCurrency(snapshot.package_price)}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Food Catering (Preserved):</span>
                            <span className="font-mono font-medium">{fmtCurrency(Math.max(0, proposedPrice - Number(snapshot.package_price || 0)))}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Changed Specifications Summary */}
            {proposal.proposed_changes && Object.keys(proposal.proposed_changes).length > 0 && (
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 space-y-2 text-xs shadow-2xs">
                <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                  Summary of Modifications
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(proposal.proposed_changes).map(([k, val]) => {
                    if (!val || typeof val !== "object" || val.from === undefined) return null;
                    const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                    let fromText = String(val.from);
                    let toText = String(val.to);
                    if (k === "total_price") {
                      fromText = fmtCurrency(val.from);
                      toText = fmtCurrency(val.to);
                    }
                    return (
                      <div key={k} className="bg-white border border-slate-200/90 rounded-lg p-2.5 text-xs shadow-2xs">
                        <span className="font-semibold text-slate-600 block text-[11px] mb-1">{label}</span>
                        <div className="flex items-center gap-2 text-slate-600">
                          <span className="line-through text-slate-400 font-mono">{fromText}</span>
                          <ArrowRight className="w-3 h-3 text-[#2C4B8A] shrink-0" />
                          <span className="font-bold text-slate-900 font-mono">{toText}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Financial Impact Bar */}
            <div className={`rounded-xl border p-3 flex items-center justify-between flex-wrap gap-2 text-xs sm:text-sm font-semibold shadow-2xs ${
              priceDiff > 0
                ? "border-[#2C4B8A]/20 bg-[#2C4B8A]/5 text-slate-800"
                : priceDiff < 0
                  ? "border-emerald-200 bg-emerald-50/70 text-slate-800"
                  : "border-slate-200 bg-slate-50/70 text-slate-700"
            }`}>
              <span className="font-bold text-slate-700">Financial Impact:</span>
              {priceDiff > 0 ? (
                <span className="font-mono font-bold text-xs bg-[#2C4B8A] text-white px-3 py-1 rounded-full shadow-2xs">
                  + {fmtCurrency(priceDiff)} adjustment
                </span>
              ) : priceDiff < 0 ? (
                <span className="font-mono font-bold text-xs bg-emerald-700 text-white px-3 py-1 rounded-full shadow-2xs">
                  - {fmtCurrency(Math.abs(priceDiff))} price reduction
                </span>
              ) : (
                <span className="font-mono font-semibold text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full">
                  No price change
                </span>
              )}
            </div>
          </>
        )}

        {/* Decline Form view */}
        {activeTab === "reject" && (
          <div className="space-y-3.5 p-4 bg-rose-50/60 border border-rose-200 rounded-xl shadow-2xs">
            <p className="text-slate-700 leading-relaxed text-xs sm:text-[13px] font-medium">
              Please let catering management know why you're declining this proposal (optional):
            </p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Schedule conflicts, budget considerations, or specific setup preferences..."
              className="w-full p-3 bg-white border border-rose-200/80 rounded-xl text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-rose-400/20 focus:border-rose-400 shadow-2xs transition-all"
            />
          </div>
        )}

        {/* Counter-Propose Form view */}
        {activeTab === "counter" && (
          <form onSubmit={handleConfirmCounter} className="space-y-4">
            {proposal.message && (
              <div className="rounded-xl bg-[#2C4B8A]/5 border border-[#2C4B8A]/15 p-3 flex items-start gap-2.5 shadow-2xs">
                <MessageSquare size={14} className="text-[#2C4B8A] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C4B8A] block">
                    Management Revision Note
                  </span>
                  <p className="text-xs text-slate-700 italic font-medium">"{proposal.message}"</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5 shadow-2xs">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Adjustment Details / Feedback <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                  placeholder="Describe desired adjustments (e.g. keep original 20x20 scaffold, change start time to 3:00 PM, adjust layout)..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C4B8A]/20 focus:border-[#2C4B8A] transition-all shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    value={counterDate}
                    onChange={(e) => setCounterDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2C4B8A]/20 focus:border-[#2C4B8A] shadow-2xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Preferred Time</label>
                  <input
                    type="text"
                    value={counterTime}
                    onChange={(e) => setCounterTime(e.target.value)}
                    placeholder="e.g. 2:00 PM"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C4B8A]/20 focus:border-[#2C4B8A] shadow-2xs transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Guest Count</label>
                  <input
                    type="number"
                    min="1"
                    value={counterGuests}
                    onChange={(e) => setCounterGuests(e.target.value)}
                    placeholder="e.g. 180"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C4B8A]/20 focus:border-[#2C4B8A] shadow-2xs transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Venue Location</label>
                  <input
                    type="text"
                    value={counterVenue}
                    onChange={(e) => setCounterVenue(e.target.value)}
                    placeholder="e.g. Grand Ballroom"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2C4B8A]/20 focus:border-[#2C4B8A] shadow-2xs transition-all"
                  />
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
