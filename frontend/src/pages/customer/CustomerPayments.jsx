import { useEffect, useMemo, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import CustomerPaymentsTable from "../../components/tables/CustomerPaymentsTable";
import CustomerReceiptModal from "../../components/customer/portal/CustomerReceiptModal";
import useToast from "../../hooks/useToast";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  CreditCard,
  Wallet,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Sparkles,
  Search,
  Filter,
  Calendar,
  CalendarDays,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Layers,
  Table as TableIcon,
  Receipt,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString()}`;

export default function CustomerPayments() {
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingTargetId, setPayingTargetId] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  // Receipt Modal State
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [receiptBooking, setReceiptBooking] = useState(null);

  // Filters & View State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBookingFilter, setSelectedBookingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'cards'

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, bRes] = await Promise.all([
        CustomerAPI.getPayments(),
        CustomerAPI.getBookings(),
      ]);

      let data = pRes.data || [];
      const bookingsData = bRes.data || [];

      if (searchParams.get("status") === "success") {
        let updated = false;
        for (const p of data) {
          if (p.status === "pending") {
            try {
              const vRes = await CustomerAPI.verifyPayment(p._id);
              if (vRes.data?.payment?.status === "approved") {
                updated = true;
              }
            } catch {
              // A later refresh or PayMongo webhook reconciles it
            }
          }
        }
        if (updated) {
          const fresh = await CustomerAPI.getPayments();
          data = fresh.data || [];
        }
      }

      setPayments(data);
      setBookings(bookingsData);

      // Compute refunds based on cancelled/refunded bookings
      const cancelledBookings = bookingsData.filter(
        (b) => b.status === "cancelled" || b.status === "refunded"
      );
      const computedRefunds = cancelledBookings
        .map((b) => {
          const bPayments = data.filter(
            (p) => String(p.booking_id?._id || p.booking_id) === String(b._id)
          );
          const totalPaid = bPayments
            .filter((p) => p.status === "approved")
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

          return {
            _id: b._id,
            id: b.reference || (b._id ? b._id.substring(b._id.length - 8).toUpperCase() : "-"),
            type: b.event_type || "Event",
            reason:
              b.cancellation_reason ||
              (b.ocular_visit?.outcome === "cancel" ? "Ocular cancelled" : "Cancelled"),
            deposit: totalPaid,
            amount:
              b.status === "refunded"
                ? totalPaid
                : totalPaid > 0
                ? "Pending Calculation"
                : 0,
            status:
              b.status === "refunded"
                ? "refunded"
                : totalPaid > 0
                ? "pending"
                : "no_refund",
          };
        })
        .filter((r) => r.status === "refunded" || r.status === "pending");

      setRefunds(computedRefunds);
    } catch {
      setPayments([]);
      setBookings([]);
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  const paymentStatus = searchParams.get("status");

  // Helper: Total approved amount paid for a specific booking
  const getBookingPaidAmount = (bookingId) => {
    return payments
      .filter(
        (p) =>
          String(p.booking_id?._id || p.booking_id) === String(bookingId) &&
          p.status === "approved"
      )
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  };

  // Helper: Outstanding balance for a booking
  const getBookingRemainingBalance = (booking) => {
    if (!booking) return 0;
    if (["cancelled", "refunded"].includes(booking.status)) return 0;
    const total = Number(booking.total_price || 0);
    const paid = getBookingPaidAmount(booking._id);
    return Math.max(0, total - paid);
  };

  // Executive Metrics
  const totalSettled = useMemo(() => {
    return payments
      .filter((p) => p.status === "approved")
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [payments]);

  const approvedCount = useMemo(() => {
    return payments.filter((p) => p.status === "approved").length;
  }, [payments]);

  const totalContractValue = useMemo(() => {
    return bookings
      .filter((b) => !["cancelled", "refunded"].includes(b.status))
      .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
  }, [bookings]);

  // Bookings with an outstanding balance due or deposit required
  const actionableBalanceBookings = useMemo(() => {
    return bookings
      .filter((b) => !["cancelled", "refunded"].includes(b.status))
      .map((b) => {
        const remaining = getBookingRemainingBalance(b);
        const paid = getBookingPaidAmount(b._id);
        const isDepositStage =
          (b.status || "").toLowerCase().includes("deposit") ||
          b.payment_status === "pending" ||
          paid === 0;

        return {
          ...b,
          paidAmount: paid,
          remainingBalance: remaining,
          isDepositStage,
        };
      })
      .filter((b) => b.remainingBalance > 0);
  }, [bookings, payments]);

  // Total balance due across all active events
  const totalBalanceDue = useMemo(() => {
    return actionableBalanceBookings.reduce((sum, b) => sum + b.remainingBalance, 0);
  }, [actionableBalanceBookings]);

  // Settlement completion percentage
  const settlementPercentage = useMemo(() => {
    if (totalContractValue <= 0) return 100;
    const pct = (totalSettled / totalContractValue) * 100;
    return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
  }, [totalSettled, totalContractValue]);

  // Handle Pay Now for a booking balance
  const startPaymentForBooking = async (booking, amount, paymentType = "balance") => {
    if (!booking?._id) return;
    const payAmount = Number(amount || 0);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      notify("This booking does not have a valid balance amount.", "error");
      return;
    }

    setPayingTargetId(booking._id);
    try {
      notify("Opening secure PayMongo checkout...", "info");
      const res = await CustomerAPI.createPaymentCheckout({
        booking_id: booking._id,
        amount: payAmount,
        payment_type: paymentType,
      });

      if (res.data?.checkout_url) {
        window.location.assign(res.data.checkout_url);
      } else {
        notify("Could not generate checkout session.", "error");
        setPayingTargetId(null);
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to start payment checkout.", "error");
      setPayingTargetId(null);
    }
  };

  // Open Receipt Modal
  const handleOpenReceipt = (payment, booking) => {
    setReceiptPayment(payment);
    setReceiptBooking(booking || payment.booking_id);
  };

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // 1. Status Filter
      if (statusFilter !== "all" && String(p.status).toLowerCase() !== statusFilter) {
        return false;
      }

      // 2. Booking Filter
      if (selectedBookingFilter !== "all") {
        const bId = String(p.booking_id?._id || p.booking_id || "");
        if (bId !== String(selectedBookingFilter)) {
          return false;
        }
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = p.booking_id;
        const eventType = (b?.event_type || "").toLowerCase();
        const ref = (b?.reference || "").toLowerCase();
        const pRef = (p.gateway_reference || p.reference_number || "").toLowerCase();
        const type = (p.payment_type || "").toLowerCase();
        const method = (p.method || p.payment_method || "").toLowerCase();

        return (
          eventType.includes(q) ||
          ref.includes(q) ||
          pRef.includes(q) ||
          type.includes(q) ||
          method.includes(q)
        );
      }

      return true;
    });
  }, [payments, statusFilter, selectedBookingFilter, searchQuery]);

  // Payments grouped by Booking
  const paymentsByBooking = useMemo(() => {
    const map = new Map();

    // Initialize map with all customer bookings
    bookings.forEach((b) => {
      map.set(String(b._id), {
        booking: b,
        payments: [],
        totalPrice: Number(b.total_price || 0),
        paidAmount: 0,
      });
    });

    // Bucket payments into their respective booking
    payments.forEach((p) => {
      const bId = String(p.booking_id?._id || p.booking_id || "");
      if (bId && map.has(bId)) {
        const entry = map.get(bId);
        entry.payments.push(p);
        if (p.status === "approved") {
          entry.paidAmount += Number(p.amount || 0);
        }
      } else {
        // Inquiry or unmatched payment bucket
        const otherKey = p.inquiry_id?._id ? `inq-${p.inquiry_id._id}` : "unassigned";
        if (!map.has(otherKey)) {
          map.set(otherKey, {
            booking: p.inquiry_id || { event_type: "Catering Request", reference: "Inquiry" },
            payments: [],
            totalPrice: 0,
            paidAmount: 0,
          });
        }
        const entry = map.get(otherKey);
        entry.payments.push(p);
        if (p.status === "approved") {
          entry.paidAmount += Number(p.amount || 0);
        }
      }
    });

    return Array.from(map.values()).filter((group) => {
      // Filter out if booking filter active and not matched
      if (
        selectedBookingFilter !== "all" &&
        String(group.booking._id) !== String(selectedBookingFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [bookings, payments, selectedBookingFilter]);

  return (
    <CustomerDashboardLayout
      title="Payment History"
      subtitle="Track your payments, remaining balances, and official receipts"
    >
      {/* PayMongo Callback Alerts */}
      {paymentStatus === "success" && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="text-sm font-semibold">Payment Successful!</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Your PayMongo transaction has been verified and recorded to your account.
            </p>
          </div>
        </div>
      )}

      {paymentStatus === "cancelled" && (
        <div className="flex items-center gap-3 p-4 mb-6 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
          <XCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold">Checkout Cancelled</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              The payment session was cancelled. No charges were made to your account.
            </p>
          </div>
        </div>
      )}

      {/* ── Executive Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {/* Total Settled */}
        <Card className="border-border shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Settled
              </p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
                {formatCurrency(totalSettled)}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{approvedCount} successful payments</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/60">
              <Wallet className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Balance Due */}
        <Card
          className={cn(
            "border shadow-2xs hover:shadow-xs transition-shadow",
            totalBalanceDue > 0
              ? "border-amber-300/80 bg-amber-50/20 dark:border-amber-800/80 dark:bg-amber-950/20"
              : "border-border"
          )}
        >
          <CardContent className="p-4 sm:p-5 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Balance Due
              </p>
              <h3
                className={cn(
                  "text-2xl font-bold tracking-tight tabular-nums",
                  totalBalanceDue > 0
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-foreground"
                )}
              >
                {formatCurrency(totalBalanceDue)}
              </h3>
              <p className="text-xs text-muted-foreground">
                {totalBalanceDue > 0 ? (
                  <span className="text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {actionableBalanceBookings.length} booking
                    {actionableBalanceBookings.length > 1 ? "s" : ""} pending balance
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    All accounts settled
                  </span>
                )}
              </p>
            </div>
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                totalBalanceDue > 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Contract Value */}
        <Card className="border-border shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contract Value
              </p>
              <h3 className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
                {formatCurrency(totalContractValue)}
              </h3>
              <p className="text-xs text-muted-foreground">
                Across {bookings.length} catering event{bookings.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/60">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Payment Completion Progress */}
        <Card className="border-border shadow-2xs hover:shadow-xs transition-shadow">
          <CardContent className="p-4 sm:p-5 flex items-start justify-between">
            <div className="space-y-1.5 w-full mr-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payment Progress
              </p>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-2xl font-bold text-foreground tracking-tight tabular-nums">
                  {settlementPercentage}%
                </h3>
                <span className="text-xs text-muted-foreground font-medium">Settled</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${settlementPercentage}%` }}
                />
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/60">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-7">
        {/* ── Upcoming Payments & Balance Due Section ── */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="py-4 px-5 border-b border-border/70 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg font-serif text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Upcoming Payments & Balance Due
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Outstanding balances and deposits required for confirmed catering events
              </p>
            </div>
            {totalBalanceDue > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 text-xs font-semibold">
                {actionableBalanceBookings.length} Due
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {actionableBalanceBookings.length > 0 ? (
              <div className="grid grid-cols-1 gap-3.5">
                {actionableBalanceBookings.map((b) => (
                  <div
                    key={b._id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/15 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-foreground">
                          {b.event_type || "Catering Booking"}
                        </h4>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-muted rounded text-muted-foreground">
                          {b.reference || `BK-${b._id.slice(-6).toUpperCase()}`}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[11px] capitalize",
                            b.isDepositStage
                              ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                          )}
                        >
                          {b.isDepositStage ? "Deposit Required" : "Remaining Balance"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {b.event_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                            <span>
                              Event:{" "}
                              {new Date(b.event_date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                        {b.package_name_snapshot && (
                          <div>
                            Package: <span className="font-medium text-foreground">{b.package_name_snapshot}</span>
                          </div>
                        )}
                        {b.celebrant_name && (
                          <div>
                            For: <span className="font-medium text-foreground">{b.celebrant_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Payment Breakdown */}
                      <div className="flex items-center gap-3 text-xs pt-0.5">
                        <span className="text-muted-foreground">
                          Contract: <strong className="text-foreground">{formatCurrency(b.total_price)}</strong>
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">
                          Paid: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(b.paidAmount)}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3.5 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                      <div className="text-left md:text-right">
                        <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                          Amount Due
                        </div>
                        <div className="text-xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                          {formatCurrency(b.remainingBalance)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link to={`/customer/bookings/${b._id}`}>
                          <Button variant="outline" size="sm" className="h-9 text-xs">
                            View Event
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          onClick={() =>
                            startPaymentForBooking(
                              b,
                              b.remainingBalance,
                              b.isDepositStage ? "deposit" : "balance"
                            )
                          }
                          disabled={payingTargetId === b._id}
                          className="h-9 text-xs font-semibold gap-1.5 shadow-2xs"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{payingTargetId === b._id ? "Opening..." : "Pay Now"}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-7 px-4 bg-muted/15 rounded-xl border border-dashed border-border/80">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">All Payments Up to Date</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-0.5">
                  You have no pending balance or deposit payments due at this time across all your confirmed events.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Refunds & Cancellations Section (if applicable) ── */}
        {refunds.length > 0 && (
          <Card className="border-border shadow-2xs border-dashed">
            <CardHeader className="py-3 px-5 bg-muted/20 border-b border-border/70">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <RefreshCcw className="w-4 h-4 text-primary" />
                Refunds & Cancellations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {refunds.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{r.type}</h4>
                      <div className="text-xs text-muted-foreground mt-0.5">Ref: {r.id}</div>
                      <div className="text-xs text-muted-foreground">Reason: {r.reason}</div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <div className="text-[11px] text-muted-foreground">
                          Paid: {formatCurrency(r.deposit)}
                        </div>
                        {r.status === "refunded" ? (
                          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                            Refunded: {formatCurrency(r.amount)}
                          </div>
                        ) : (
                          <div className="text-base font-bold text-amber-600 dark:text-amber-400">
                            Refund Pending
                          </div>
                        )}
                      </div>
                      <Badge variant={r.status === "refunded" ? "default" : "secondary"}>
                        {r.status === "refunded" ? "Refunded" : "Processing"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── All Payment Transactions ── */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="py-4 px-5 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-serif text-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                Payment Transaction History
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Itemized transaction records for your events, inquiries, and official receipts
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
                  viewMode === "table"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Ledger</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
                  viewMode === "cards"
                    ? "bg-card text-foreground shadow-2xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>By Booking</span>
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Toolbar: Search, Booking filter, Status filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by event, reference number, or transaction ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Booking filter dropdown */}
              <div className="sm:w-56 shrink-0">
                <select
                  value={selectedBookingFilter}
                  onChange={(e) => setSelectedBookingFilter(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All Events & Bookings ({bookings.length})</option>
                  {bookings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.event_type} ({b.reference || "BK"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="sm:w-36 shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">All Statuses</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed / Cancelled</option>
                </select>
              </div>
            </div>

            {/* Content: Either Ledger Table or Grouped by Booking */}
            {viewMode === "table" ? (
              <CustomerPaymentsTable
                payments={filteredPayments}
                bookings={bookings}
                formatCurrency={formatCurrency}
                onViewReceipt={handleOpenReceipt}
                showEventDetails={true}
              />
            ) : (
              /* Grouped by Booking Card View */
              <div className="space-y-4">
                {paymentsByBooking.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm font-semibold text-foreground">No matching events or payments</p>
                    <p className="text-xs text-muted-foreground">Try adjusting your filters or search query.</p>
                  </div>
                ) : (
                  paymentsByBooking.map(({ booking, payments: groupPayments, totalPrice, paidAmount }) => {
                    const bId = booking._id;
                    const eventTitle = booking.event_type || "Catering Booking";
                    const bookingRef = booking.reference || (bId ? `BK-${bId.slice(-6).toUpperCase()}` : "-");
                    const remaining = Math.max(0, totalPrice - paidAmount);
                    const progress = totalPrice > 0 ? Math.min(100, Math.round((paidAmount / totalPrice) * 100)) : 100;

                    return (
                      <div
                        key={bId || bookingRef}
                        className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs"
                      >
                        {/* Event Header Banner */}
                        <div className="p-4 bg-muted/20 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-foreground">{eventTitle}</h4>
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-muted rounded text-muted-foreground">
                                {bookingRef}
                              </span>
                              {booking.package_name_snapshot && (
                                <span className="text-xs text-muted-foreground">
                                  • {booking.package_name_snapshot}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              {booking.event_date && (
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  {new Date(booking.event_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              )}
                              {bId && (
                                <Link
                                  to={`/customer/bookings/${bId}`}
                                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                                >
                                  <span>View Booking</span>
                                  <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* Event Progress & Balance */}
                          <div className="text-left sm:text-right space-y-1">
                            <div className="flex items-center sm:justify-end gap-2 text-xs">
                              <span className="text-muted-foreground">
                                Paid: <strong className="text-emerald-600 dark:text-emerald-400">{formatCurrency(paidAmount)}</strong>
                              </span>
                              {totalPrice > 0 && (
                                <>
                                  <span className="text-muted-foreground">/</span>
                                  <span className="font-medium text-foreground">{formatCurrency(totalPrice)}</span>
                                </>
                              )}
                            </div>

                            {totalPrice > 0 && (
                              <div className="w-36 bg-muted rounded-full h-1.5 sm:ml-auto overflow-hidden">
                                <div
                                  className="bg-primary h-full rounded-full"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            )}

                            {remaining > 0 ? (
                              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block">
                                Remaining: {formatCurrency(remaining)}
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                                Fully Paid (100%)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Payments for this event */}
                        <div className="divide-y divide-border/60">
                          {groupPayments.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              No payments recorded yet for this booking.
                            </div>
                          ) : (
                            groupPayments.map((p) => (
                              <div
                                key={p._id}
                                className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/15 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <Receipt className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-xs text-foreground capitalize">
                                        {p.payment_type === "deposit"
                                          ? "Initial Deposit"
                                          : p.payment_type === "balance"
                                          ? "Remaining Balance"
                                          : "Payment"}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px] py-0 px-1.5 capitalize font-medium",
                                          p.status === "approved"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                                        )}
                                      >
                                        {p.status}
                                      </Badge>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                      <span>
                                        {p.createdAt
                                          ? new Date(p.createdAt).toLocaleDateString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                            })
                                          : "-"}
                                      </span>
                                      <span>•</span>
                                      <span className="capitalize">{p.method || p.payment_method || "PayMongo"}</span>
                                      {(p.gateway_reference || p.reference_number) && (
                                        <>
                                          <span>•</span>
                                          <span className="font-mono text-[10px]">
                                            {p.gateway_reference || p.reference_number}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-3 pl-11 sm:pl-0">
                                  <span className="font-bold text-sm text-foreground tabular-nums">
                                    {formatCurrency(p.amount)}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenReceipt(p, booking)}
                                    className="h-7 text-xs font-medium gap-1 text-primary hover:text-primary hover:bg-primary/10 px-2"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>Receipt</span>
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Official Printable Receipt Modal ── */}
      {receiptPayment && (
        <CustomerReceiptModal
          payment={receiptPayment}
          booking={receiptBooking}
          onClose={() => {
            setReceiptPayment(null);
            setReceiptBooking(null);
          }}
          formatCurrency={formatCurrency}
        />
      )}
    </CustomerDashboardLayout>
  );
}
