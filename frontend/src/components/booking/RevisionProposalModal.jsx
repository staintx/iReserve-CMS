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
  RefreshCw
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
  isCustomer = true 
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

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
      setRejecting(false);
      setRejectReason("");
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Sparkles className="w-4.5 h-4.5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Revised Booking Proposal
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Proposed by {proposal.proposed_by === "admin" ? "Catering Manager / Admin" : "Customer"} on {proposal.requested_at ? new Date(proposal.requested_at).toLocaleDateString() : "Recently"}
              </DialogDescription>

            </div>
          </div>
        </DialogHeader>

        {proposal.message && (
          <div className="bg-amber-50 border border-amber-200/70 rounded-md shadow-2xs p-3.5 my-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              "{proposal.message}"
            </p>
          </div>
        )}

        <div className="space-y-4 py-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Terms Comparison (Current vs. Proposed)
          </p>

          {/* Side-by-Side Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Current Terms */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-md shadow-2xs p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Current Booking</span>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-slate-300/60">Active</span>
              </div>

              <div className="space-y-2 text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Date: <strong>{formattedCurrentDate}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Time: <strong>{booking.start_time || "TBA"}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Guests: <strong>{booking.guest_count || 0} pax</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Venue: <strong>{booking.venue_type || "N/A"}</strong></span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 font-medium">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>Total Price: <strong className="text-slate-900 font-mono">{fmtCurrency(currentPrice)}</strong></span>
                </div>
              </div>
            </div>

            {/* Proposed Terms */}
            <div className="bg-amber-50/50 border border-amber-200 rounded-md shadow-2xs p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <span className="font-bold text-amber-900 uppercase tracking-wider text-[10px]">Proposed Revision</span>
                <span className="bg-amber-200 text-amber-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-amber-300">New Deal</span>
              </div>

              <div className="space-y-2 text-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Date: <strong className={formattedProposedDate !== formattedCurrentDate ? "text-amber-800 font-bold" : ""}>{formattedProposedDate}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Time: <strong className={snapshot.start_time && snapshot.start_time !== booking.start_time ? "text-amber-800 font-bold" : ""}>{snapshot.start_time || booking.start_time || "TBA"}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-amber-600" />
                  <span>Guests: <strong className={snapshot.guest_count !== undefined && snapshot.guest_count !== booking.guest_count ? "text-amber-800 font-bold" : ""}>{snapshot.guest_count ?? booking.guest_count} pax</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Venue: <strong>{snapshot.venue_type || booking.venue_type || "N/A"}</strong></span>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-amber-200/80 font-medium">
                  <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                  <span>Total Price: <strong className="text-amber-950 font-bold font-mono">{fmtCurrency(proposedPrice)}</strong></span>
                </div>
              </div>
            </div>

          </div>

          {/* Financial Summary Impact */}
          <div className="bg-white border border-slate-200 rounded-md shadow-2xs p-4 flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-medium text-slate-600">Price Adjustment:</span>
            {priceDiff > 0 ? (
              <span className="font-mono font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-md border border-amber-200">
                + {fmtCurrency(priceDiff)} increase in total balance
              </span>
            ) : priceDiff < 0 ? (
              <span className="font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-md border border-emerald-200">
                - {fmtCurrency(Math.abs(priceDiff))} price reduction
              </span>
            ) : (
              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                No change in total price
              </span>
            )}
          </div>

          {/* Rejection Note Input */}
          {rejecting && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-700">Reason for Declining (Optional):</label>
              <Input 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why you are declining these proposed terms..."
                className="text-xs bg-slate-50 border-slate-200"
              />
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-end gap-2">
          {rejecting ? (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setRejecting(false)} 
                className="text-xs"
                disabled={loading}
              >
                Back
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleConfirmReject} 
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                disabled={loading}
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Confirm Recline"}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setRejecting(true)} 
                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                disabled={loading}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> Decline Proposal
              </Button>
              <Button 
                size="sm" 
                onClick={handleConfirmAccept} 
                className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                disabled={loading}
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                Accept & Confirm Revised Deal
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
