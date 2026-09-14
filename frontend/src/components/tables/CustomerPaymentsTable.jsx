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
        return (
          <Badge
            variant="default"
            className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 inline-flex items-center gap-1 text-[11px] py-0.5 px-2 rounded-md font-semibold dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 inline-flex items-center gap-1 text-[11px] py-0.5 px-2 rounded-md font-semibold dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
          >
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Pending
          </Badge>
        );
      case "rejected":
      case "cancelled":
      case "failed":
        return (
          <Badge
            variant="destructive"
            className="bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 inline-flex items-center gap-1 text-[11px] py-0.5 px-2 rounded-md font-semibold dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
          >
            <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="capitalize text-[11px] py-0.5 px-2 rounded-md">
            {status || "Unknown"}
          </Badge>
        );
    }
  };

  const getMilestoneBadge = (type) => {
    const t = String(type || "").toLowerCase();
    if (t === "deposit") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
          Initial Deposit
        </span>
      );
    }
    if (t === "balance") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
          Remaining Balance
        </span>
      );
    }
    if (t === "full") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
          Full Payment
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border">
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
      <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded text-[11px] font-medium text-foreground">
        <CreditCard className="w-3 h-3 text-muted-foreground" />
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
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-2xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
              {showEventDetails && (
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4 min-w-[200px]">
                  Event / Booking
                </TableHead>
              )}
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">
                Milestone
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">
                Date & Time
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">
                Method
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">
                Amount Paid
              </TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-3 px-4">
                Status
              </TableHead>
              {onViewReceipt && (
                <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-right py-3 px-4 min-w-[100px]">
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
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <CreditCard className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">No transaction records found</p>
                    <p className="text-xs text-muted-foreground">
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
                  <TableRow key={p._id} className="hover:bg-muted/20 transition-colors border-b border-border/60">
                    {showEventDetails && (
                      <TableCell className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-foreground">{eventType}</span>
                            {bookingRef && b?._id ? (
                              <Link
                                to={`/customer/bookings/${b._id}`}
                                className="font-mono text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
                                title="Open Event Dashboard"
                              >
                                {bookingRef}
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </Link>
                            ) : bookingRef ? (
                              <span className="font-mono text-[11px] text-muted-foreground">{bookingRef}</span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                            {packageName && (
                              <span className="truncate max-w-[160px]" title={packageName}>
                                {packageName}
                              </span>
                            )}
                            {eventDate && (
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="w-3 h-3 text-muted-foreground/70" />
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

                    <TableCell className="py-3 px-4">
                      {getMilestoneBadge(p.payment_type)}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-xs py-3 px-4">
                      <div>
                        <div className="flex items-center gap-1 text-foreground font-medium">
                          <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                        {formattedTime && (
                          <div className="text-[10px] text-muted-foreground pl-4">{formattedTime}</div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <div>
                        {getPaymentMethodDisplay(p)}
                        {(p.gateway_reference || p.reference_number) && (
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-[110px]">
                            {p.gateway_reference || p.reference_number}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      <div>
                        <span className="font-bold text-sm text-foreground tabular-nums">
                          {fmt(p.amount)}
                        </span>
                        {b?.total_price && (
                          <div className="text-[10px] text-muted-foreground">
                            of {fmt(b.total_price)}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 px-4">
                      {getStatusBadge(p.status)}
                    </TableCell>

                    {onViewReceipt && (
                      <TableCell className="text-right py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewReceipt(p, b)}
                          className="h-7 text-xs font-medium gap-1 text-primary hover:text-primary hover:bg-primary/10 px-2"
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

