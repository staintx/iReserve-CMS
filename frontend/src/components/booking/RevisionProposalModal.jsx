import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  MapPin, 
  FileText, 
  Sparkles,
  RefreshCw,
  Edit,
  MessageSquare
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

  const handleOpenChange = (val) => {
    if (!val) {
      setActiveTab("view");
      setRejectReason("");
    }
    onClose(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2C4B8A]" />
              Revised Booking Proposal
            </DialogTitle>
            <span className="text-xs bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
              {booking.reference || `BK-${booking._id.substring(booking._id.length - 6).toUpperCase()}`}
            </span>
          </div>
          <DialogDescription className="text-[13px] text-slate-500 mt-0.5">
            Proposed by {proposal.proposed_by === "admin" ? "Catering Manager" : "Customer"} on {proposal.requested_at ? new Date(proposal.requested_at).toLocaleDateString() : "Recently"}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-4">
          {/* Prominent Admin Revision Note */}
          {proposal.message && (
            <div className="bg-blue-50/90 border border-blue-200 rounded-lg p-3.5 flex items-start gap-2.5 shadow-2xs">
              <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  {proposal.proposed_by === "admin" ? "Manager Revision Note" : "Proposal Note"}
                </span>
                <p className="text-sm text-blue-950 leading-relaxed font-medium mt-0.5 italic">
                  "{proposal.message}"
                </p>
              </div>
            </div>
          )}

          {activeTab === "view" && (
            <>
              <p className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-500">
                Terms Comparison (Current vs. Proposed)
              </p>

              {/* Side-by-Side Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                
                {/* Current Terms */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">Current Active Terms</span>
                    <span className="bg-slate-200 text-slate-700 text-xs font-mono font-bold px-1.5 py-0.5 rounded">Active</span>
                  </div>

                  <div className="space-y-1.5 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Date: <strong>{formattedCurrentDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>Time: <strong>{booking.start_time || "TBA"}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>Guests: <strong>{booking.guest_count || 0} pax</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>Venue: <strong>{booking.venue_type || "N/A"}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200 font-medium">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <span>Total Price: <strong className="text-slate-900 font-mono text-[15px]">{fmtCurrency(currentPrice)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Proposed Terms */}
                <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-blue-200">
                    <span className="font-bold text-blue-900 uppercase tracking-wider text-xs">Proposed Revision</span>
                    <span className="bg-blue-200 text-blue-900 text-xs font-mono font-bold px-1.5 py-0.5 rounded">Proposed</span>
                  </div>

                  <div className="space-y-1.5 text-slate-700">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Date: <strong className={formattedProposedDate !== formattedCurrentDate ? "text-blue-900 font-bold" : ""}>{formattedProposedDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Time: <strong className={snapshot.start_time && snapshot.start_time !== booking.start_time ? "text-blue-900 font-bold" : ""}>{snapshot.start_time || booking.start_time || "TBA"}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Guests: <strong className={snapshot.guest_count !== undefined && snapshot.guest_count !== booking.guest_count ? "text-blue-900 font-bold" : ""}>{snapshot.guest_count ?? booking.guest_count} pax</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span>Venue: <strong>{snapshot.venue_type || booking.venue_type || "N/A"}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 pt-1.5 border-t border-blue-200 font-medium">
                      <DollarSign className="w-4 h-4 text-blue-600" />
                      <span>Total Price: <strong className="text-blue-950 font-bold font-mono text-[15px]">{fmtCurrency(proposedPrice)}</strong></span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Financial Impact Bar */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2 text-sm">
                <span className="font-semibold text-slate-600">Financial Impact:</span>
                {priceDiff > 0 ? (
                  <span className="font-mono font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded border border-blue-200">
                    + {fmtCurrency(priceDiff)} increase
                  </span>
                ) : priceDiff < 0 ? (
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-200">
                    - {fmtCurrency(Math.abs(priceDiff))} price reduction
                  </span>
                ) : (
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                    No price change
                  </span>
                )}
              </div>
            </>
          )}

          {/* Decline Form view */}
          {activeTab === "reject" && (
            <div className="space-y-3 p-3.5 bg-rose-50/50 border border-rose-200 rounded-lg text-sm">
              <h4 className="font-bold text-rose-950 flex items-center gap-1.5 text-sm sm:text-base">
                <XCircle className="w-4 h-4 text-rose-600" /> Decline Revision Proposal
              </h4>
              <p className="text-slate-600 leading-relaxed text-[13px] sm:text-sm">
                Active booking terms will remain unchanged. You may provide an optional reason for catering management:
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Optional reason for declining..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[15px] outline-none focus:border-rose-400"
              />
            </div>
          )}

          {/* Counter-Propose Form view */}
          {activeTab === "counter" && (
            <form onSubmit={handleConfirmCounter} className="space-y-3.5 p-3.5 bg-[#2C4B8A]/5 border border-[#2C4B8A]/20 rounded-lg text-sm">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm sm:text-base">
                <Edit className="w-4 h-4 text-[#2C4B8A]" /> Request Adjustments / Counter-Propose
              </h4>
              <p className="text-slate-600 leading-relaxed text-[13px] sm:text-sm">
                Provide your feedback and preferred adjustments for catering management to review:
              </p>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Adjustment Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                  placeholder="Describe desired adjustments (e.g. change start time to 3:00 PM)..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[15px] outline-none focus:border-[#2C4B8A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    value={counterDate}
                    onChange={(e) => setCounterDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[15px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Preferred Time</label>
                  <input
                    type="text"
                    value={counterTime}
                    onChange={(e) => setCounterTime(e.target.value)}
                    placeholder="e.g. 2:00 PM"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[15px] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Guest Count</label>
                  <input
                    type="number"
                    min="1"
                    value={counterGuests}
                    onChange={(e) => setCounterGuests(e.target.value)}
                    placeholder="e.g. 100"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[15px] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Venue Location</label>
                  <input
                    type="text"
                    value={counterVenue}
                    onChange={(e) => setCounterVenue(e.target.value)}
                    placeholder="e.g. Grand Ballroom"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[15px] outline-none"
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Actions */}
        <DialogFooter className="border-t border-slate-100 pt-3 shrink-0 flex flex-wrap items-center justify-end gap-2">
          {activeTab === "reject" ? (
            <>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setActiveTab("view")} 
                disabled={loading}
                className="text-sm font-medium"
              >
                Back
              </Button>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleConfirmReject} 
                disabled={loading}
                className="text-sm bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Confirm Decline"}
              </Button>
            </>
          ) : activeTab === "counter" ? (
            <>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setActiveTab("view")} 
                disabled={loading}
                className="text-sm font-medium"
              >
                Back
              </Button>
              <Button 
                type="button" 
                onClick={handleConfirmCounter} 
                disabled={loading || !counterNote.trim()}
                className="text-sm bg-[#2C4B8A] hover:bg-[#233c6e] text-white font-bold px-4 py-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Submit Counter-Proposal"}
              </Button>
            </>
          ) : (
            <>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setActiveTab("reject")} 
                disabled={loading}
                className="text-sm font-semibold text-rose-700 border-rose-200 hover:bg-rose-50 px-3.5 py-2"
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Decline
              </Button>

              {onCounterPropose && isCustomer && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setCounterDate(snapshot.event_date ? new Date(snapshot.event_date).toISOString().split("T")[0] : "");
                    setCounterTime(snapshot.start_time || "");
                    setCounterGuests(snapshot.guest_count || "");
                    setCounterVenue(snapshot.venue_type || "");
                    setCounterRequests(snapshot.special_requests || "");
                    setActiveTab("counter");
                  }} 
                  disabled={loading}
                  className="text-sm font-semibold text-slate-700 border-slate-200 hover:bg-slate-100 px-3.5 py-2"
                >
                  <Edit className="w-4 h-4 mr-1.5" /> Request Changes
                </Button>
              )}

              <Button 
                type="button" 
                onClick={handleConfirmAccept} 
                disabled={loading}
                className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                Accept &amp; Confirm
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
