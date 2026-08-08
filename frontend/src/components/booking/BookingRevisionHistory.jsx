import React from "react";
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  Users, 
  DollarSign, 
  UserCheck, 
  ArrowRight,
  FileText
} from "lucide-react";

const fmtCurrency = (val) => {
  return "₱" + Number(val || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function BookingRevisionHistory({ booking }) {
  if (!booking) return null;

  const revisions = Array.isArray(booking.revisions) ? booking.revisions : [];
  const hasPending = Boolean(booking.pending_revision && ["pending_customer_approval", "pending_admin_approval"].includes(booking.pending_revision.status));

  if (revisions.length === 0 && !hasPending) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="font-semibold text-slate-600">No Revisions Logged</p>
        <p className="text-[11px] text-slate-400 mt-0.5">This booking has retained its original details since creation.</p>
      </div>
    );
  }

  const renderChangesSummary = (changes = {}) => {
    const entries = Object.entries(changes);
    if (entries.length === 0) return <span className="text-slate-400 italic">No specific field changes recorded</span>;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {entries.map(([key, val]) => {
          let fieldName = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          let fromVal = val?.from !== undefined ? String(val.from) : "N/A";
          let toVal = val?.to !== undefined ? String(val.to) : "N/A";

          if (key === "event_date") {
            if (val?.from) fromVal = new Date(val.from).toLocaleDateString();
            if (val?.to) toVal = new Date(val.to).toLocaleDateString();
          } else if (key === "total_price") {
            fromVal = fmtCurrency(val.from);
            toVal = fmtCurrency(val.to);
          }

          return (
            <div key={key} className="bg-white border border-slate-200/70 rounded-xl p-2 text-[11px]">
              <span className="font-bold text-slate-700 block mb-0.5">{fieldName}</span>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="line-through text-slate-400">{fromVal}</span>
                <ArrowRight className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="font-semibold text-slate-900">{toVal}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-600" />
          <h4 className="font-bold text-slate-900 text-sm font-serif">Revision Audit History</h4>
        </div>
        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
          Total Revisions: {revisions.length}
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        
        {/* Pending Deal Card */}
        {hasPending && (
          <div className="relative bg-amber-50/80 border border-amber-300/80 rounded-2xl p-4 space-y-2 text-xs shadow-sm">
            <div className="absolute -left-[27px] top-4 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-[10px] ring-4 ring-white">
              !
            </div>
            
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-amber-950 bg-amber-200/80 px-2.5 py-0.5 rounded-full text-[10px]">
                Revision Proposal Pending Confirmation
              </span>
              <span className="text-slate-500 text-[11px]">
                {booking.pending_revision.requested_at ? new Date(booking.pending_revision.requested_at).toLocaleString() : "Recently"}
              </span>
            </div>

            <p className="text-amber-900 font-medium">{booking.pending_revision.message || "Proposed changes awaiting deal confirmation."}</p>

            {renderChangesSummary(booking.pending_revision.proposed_changes)}
          </div>
        )}

        {/* Confirmed / Historical Revisions */}
        {revisions.map((rev, idx) => {
          const isConfirmed = rev.status === "confirmed";
          const formattedDate = rev.created_at ? new Date(rev.created_at).toLocaleString() : "N/A";

          return (
            <div key={idx} className="relative bg-white border border-slate-200 rounded-2xl p-4 space-y-2 text-xs shadow-sm hover:border-slate-300 transition-colors">
              <div className={`absolute -left-[27px] top-4 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ring-4 ring-white ${
                isConfirmed ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
              }`}>
                {isConfirmed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">
                    Revision v{rev.revision_number || (idx + 1)}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isConfirmed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}>
                    {isConfirmed ? "Confirmed & Applied" : "Declined"}
                  </span>
                </div>
                <span className="text-slate-400 text-[11px]">{formattedDate}</span>
              </div>

              {rev.message && (
                <p className="text-slate-700 italic font-medium">"{rev.message}"</p>
              )}

              <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
                <span>Proposed by: <strong>{rev.proposed_by === "customer" ? "Customer" : "Admin"}</strong></span>
                <span>•</span>
                <span>Confirmed by: <strong>{rev.confirmed_by === "customer" ? "Customer" : "Admin"}</strong></span>
                {rev.price_difference !== undefined && rev.price_difference !== 0 && (
                  <>
                    <span>•</span>
                    <span className={rev.price_difference > 0 ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold"}>
                      Price Impact: {rev.price_difference > 0 ? `+${fmtCurrency(rev.price_difference)}` : fmtCurrency(rev.price_difference)}
                    </span>
                  </>
                )}
              </div>

              {renderChangesSummary(rev.changes)}
            </div>
          );
        })}

      </div>
    </div>
  );
}
