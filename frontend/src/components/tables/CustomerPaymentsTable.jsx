import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  Receipt,
  ExternalLink,
  Sparkles,
  CalendarDays,
} from "lucide-react";

export default function CustomerPaymentsTable({
  payments = [],
  formatCurrency,
  bookings = [],
  onViewReceipt,
  showEventDetails = true,
}) {
  const fmt = (val) =>
    formatCurrency ? formatCurrency(val) : `₱${Number(val || 0).toLocaleString()}`;

  const getStatusBadge = (status) => {
    switch (String(status || "").toLowerCase()) {
      case "approved":
      case "paid":
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 inline-flex items-center gap-1 text-[11px] py-0.5 px-2 rounded-md font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
          </span>
        );
      case "pending":
        return (
          <span className="bg-amber-50 text-amber-700 border border-amber-200/80 inline-flex items-center gap-1 text-[11px] py-0.5 px-2 rounded-md font-semibold">
            <Clock className="w-3 h-3 text-amber-600" /> Pending
          </span>
        );
      case "rejected":
      case "cancelled":
      case "declined":
      case "failed":
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200/80 inline-flex items-center gap-1 text-[11px] py-0.5 px-2 rounded-md font-semibold">
            <XCircle className="w-3 h-3 text-rose-600" /> Failed
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-600 border border-slate-200/80 inline-flex items-center gap-1 text-[11px] py-0.5 px-2 rounded-md font-semibold capitalize">
            {status || "Unknown"}
          </span>
        );
    }
  };

  const getMilestoneBadge = (type) => {
    const t = String(type || "").toLowerCase();
    if (t === "deposit") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50/80 text-[#4C81E0] border border-blue-200/70">
          Initial Deposit
        </span>
      );
    }
    if (t === "balance") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50/80 text-[#4C81E0] border border-blue-200/70">
          Remaining Balance
        </span>
      );
    }
    if (t === "full") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50/80 text-emerald-700 border border-emerald-200/80">
          Full Payment
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/80">
        Payment
      </span>
    );
  };

  const getPaymentMethodDisplay = (p) => {
    const m = String(p.method || p.payment_method || "PayMongo").toLowerCase();
    let label = "PayMongo";
    if (m.includes("gcash")) label = "GCash";
    else if (m.includes("maya")) label = "Maya";
    else if (m.includes("card")) label = "Card";
    else if (m.includes("cash")) label = "Cash";
    else if (m.includes("bank")) label = "Bank Transfer";

    return (
      <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
        <CreditCard className="w-3 h-3 text-slate-400" />
        {label}
      </span>
    );
  };

  const resolveBooking = (p) => {
    if (p.booking_id && typeof p.booking_id === "object" && p.booking_id._id) {
      return p.booking_id;
    }
    const bId = p.booking_id?._id || p.booking_id;
    if (bId && bookings.length > 0) {
      const match = bookings.find((b) => String(b._id) === String(bId));
      if (match) return match;
    }
    return null;
  };

  const resolveInquiry = (p) => {
    if (p.inquiry_id && typeof p.inquiry_id === "object" && p.inquiry_id._id) {
      return p.inquiry_id;
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-slate-200/80 overflow-hidden bg-white shadow-xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-slate-100">
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-3 px-4">
                Date &amp; Time
              </TableHead>
              {showEventDetails && (
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-3 px-4 min-w-[200px]">
                  Event / Booking
                </TableHead>
              )}
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-3 px-4">
                Payment
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-3 px-4">
                Method
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-3 px-4">
                Amount
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 py-3 px-4">
                Status
              </TableHead>
              {onViewReceipt && (
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 text-right py-3 px-4 min-w-[100px]">
                  Receipt
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showEventDetails ? (onViewReceipt ? 7 : 6) : (onViewReceipt ? 6 : 5)}
                  className="h-32 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <CreditCard className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No transaction records found</p>
                    <p className="text-xs text-slate-400">
                      Payments and official receipts will appear here as they are processed.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => {
                const b = resolveBooking(p);
                const inq = resolveInquiry(p);

                const eventType = b?.event_type || inq?.event_type || "Catering Event";
                const bookingRef =
                  b?.reference ||
                  inq?.reference ||
                  (b?._id ? `BK-${b._id.slice(-6).toUpperCase()}` : null);
                const packageName =
                  b?.package_name_snapshot ||
                  b?.package_id?.name ||
                  inq?.package_name_snapshot ||
                  null;
                const eventDate = b?.event_date || inq?.event_date;
                const formattedDate = p.createdAt
                  ? new Date(p.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "-";
                const formattedTime = p.createdAt
                  ? new Date(p.createdAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "";

                return (
                  <TableRow key={p._id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                    {/* 1. Date & Time */}
                    <TableCell className="text-slate-500 text-xs py-3 px-4">
                      <div>
                        <div className="flex items-center gap-1 text-slate-900 font-semibold">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                        {formattedTime && (
                          <div className="text-[10px] text-slate-400 pl-4">{formattedTime}</div>
                        )}
                      </div>
                    </TableCell>

                    {/* (Optional) Event Details */}
                    {showEventDetails && (
                      <TableCell className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{eventType}</span>
                            {bookingRef && b?._id ? (
                              <Link
                                to={`/customer/bookings/${b._id}`}
                                className="font-mono text-[11px] font-semibold text-[#4C81E0] hover:underline inline-flex items-center gap-0.5"
                                title="Open Event Dashboard"
                              >
                                {bookingRef}
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </Link>
                            ) : bookingRef ? (
                              <span className="font-mono text-[11px] text-slate-500">{bookingRef}</span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                            {packageName && (
                              <span className="truncate max-w-[160px]" title={packageName}>
                                {packageName}
                              </span>
                            )}
                            {eventDate && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="w-3 h-3 text-slate-400" />
                                {new Date(eventDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}

                    {/* 2. Payment (Milestone) */}
                    <TableCell className="py-3 px-4">
                      {getMilestoneBadge(p.payment_type)}
                    </TableCell>

                    {/* 3. Method */}
                    <TableCell className="py-3 px-4">
                      <div>
                        {getPaymentMethodDisplay(p)}
                        {(p.gateway_reference || p.reference_number) && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[110px]" title={p.gateway_reference || p.reference_number}>
                            {p.gateway_reference || p.reference_number}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* 4. Amount Paid */}
                    <TableCell className="py-3 px-4">
                      <div>
                        <span className="font-bold text-sm text-slate-900 tabular-nums">
                          {fmt(p.amount)}
                        </span>
                        {b?.total_price && (
                          <div className="text-[10px] text-slate-400">
                            of {fmt(b.total_price)}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* 5. Status */}
                    <TableCell className="py-3 px-4">
                      {getStatusBadge(p.status)}
                    </TableCell>

                    {/* 6. Receipt (Secondary) */}
                    {onViewReceipt && (
                      <TableCell className="text-right py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewReceipt(p, b)}
                          className="h-7 text-xs font-semibold gap-1 text-[#4C81E0] hover:text-[#3b6ec6] hover:bg-blue-50 px-2 cursor-pointer"
                          title="View Official Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

