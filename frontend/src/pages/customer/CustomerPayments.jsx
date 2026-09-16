import { useEffect, useMemo, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import CustomerPaymentsTable from "../../components/tables/CustomerPaymentsTable";
import CustomerReceiptModal from "../../components/customer/portal/CustomerReceiptModal";
import PaymentChoiceModal from "../../components/customer/PaymentChoiceModal";
import useToast from "../../hooks/useToast";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import StatTile from "../../components/customer/portal/StatTile";
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

  // Payment Choice Modal State (for balance payments)
  const [choiceModalBooking, setChoiceModalBooking] = useState(null);
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);

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

    if (paymentType === "balance" || !booking.isDepositStage) {
      // Final / remaining balance payment: open choice modal
      setChoiceModalBooking(booking);
      setChoiceModalOpen(true);
      return;
    }

    // Deposit stage: direct PayMongo checkout to secure the booking
    setPayingTargetId(booking._id);
    try {
      notify("Opening secure PayMongo checkout...", "info");
      const res = await CustomerAPI.createPaymentCheckout({
        booking_id: booking._id,
        amount: payAmount,
        payment_type: "deposit",
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

      {/* ── High-Density Metric Cards (Exact Screenshot Card Style) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mb-5">
        <StatTile
          icon={Wallet}
          label="Total Settled"
          value={formatCurrency(totalSettled)}
          hint={`${approvedCount} successful payments`}
        />
        <StatTile
          icon={CreditCard}
          label="Balance Due"
          value={formatCurrency(totalBalanceDue)}
          hint={
            totalBalanceDue > 0
              ? `${actionableBalanceBookings.length} booking${actionableBalanceBookings.length > 1 ? "s" : ""} pending`
              : "All accounts settled"
          }
          className={totalBalanceDue > 0 ? "border-amber-200" : undefined}
        />
        <StatTile
          icon={FileText}
          label="Contract Value"
          value={formatCurrency(totalContractValue)}
          hint={`Across ${bookings.length} catering event${bookings.length !== 1 ? "s" : ""}`}
        />
        <StatTile
          icon={Sparkles}
          label="Payment Progress"
          value={`${settlementPercentage}%`}
          hint={`${formatCurrency(totalSettled)} of ${formatCurrency(totalContractValue)}`}
        />
      </div>

      <div className="space-y-5">
        {/* ── Upcoming Payments & Balance Due Section (Rendered when balances are actionable) ── */}
        {actionableBalanceBookings.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#2C4B8A] stroke-[1.75]" />
                <h2 className="text-sm sm:text-base font-bold text-slate-800 font-sans">
                  Upcoming Payments & Balance Due
                </h2>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs font-semibold">
                {actionableBalanceBookings.length} Due
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {actionableBalanceBookings.map((b) => (
                <div
                  key={b._id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900 truncate font-sans">
                        {b.event_type || "Catering Booking"}
                      </h4>
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600">
                        {b.reference || `BK-${b._id.slice(-6).toUpperCase()}`}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          b.isDepositStage
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        {b.isDepositStage ? "Deposit Required" : "Remaining Balance"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {b.event_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
                          Package: <span className="font-semibold text-slate-700">{b.package_name_snapshot}</span>
                        </div>
                      )}
                      {b.celebrant_name && (
                        <div>
                          For: <span className="font-semibold text-slate-700">{b.celebrant_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Payment Breakdown */}
                    <div className="flex items-center gap-3 text-xs pt-0.5">
                      <span className="text-slate-500">
                        Contract: <strong className="text-slate-900">{formatCurrency(b.total_price)}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">
                        Paid: <strong className="text-emerald-700">{formatCurrency(b.paidAmount)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/80 shrink-0">
                    <div className="text-left md:text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Amount Due
                      </div>
                      <div className="text-lg font-bold text-amber-700 tabular-nums">
                        {formatCurrency(b.remainingBalance)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link to={`/customer/bookings/${b._id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs rounded-md border-slate-200">
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
                        className="h-8 text-xs font-semibold gap-1.5 shadow-2xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-[0.98]"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{payingTargetId === b._id ? "Opening..." : "Pay Now"}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Refunds & Cancellations Section (if applicable) ── */}
        {refunds.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="py-3.5 px-5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
                <RefreshCcw className="w-3.5 h-3.5 text-[#2C4B8A]" />
                Refunds & Cancellations
              </h3>
            </div>
            <div>
              <div className="divide-y divide-slate-100">
                {refunds.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{r.type}</h4>
                      <div className="text-xs text-slate-400 mt-0.5">Ref: {r.id}</div>
                      <div className="text-xs text-slate-500">Reason: {r.reason}</div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400">
                          Paid: {formatCurrency(r.deposit)}
                        </div>
                        {r.status === "refunded" ? (
                          <div className="text-base font-bold text-emerald-700">
                            Refunded: {formatCurrency(r.amount)}
                          </div>
                        ) : (
                          <div className="text-base font-bold text-amber-700">
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
            </div>
          </div>
        )}

        {/* ── All Payment Transactions ── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="py-3.5 px-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold font-sans text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#2C4B8A] stroke-[1.75]" />
                Payment Transaction History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized transaction records for your events, inquiries, and official receipts
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg border border-slate-200/80 shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer",
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Ledger</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer",
                  viewMode === "cards"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>By Booking</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
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
                        className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
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
          </div>
        </div>
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

      {choiceModalOpen && choiceModalBooking && (
        <PaymentChoiceModal
          open={choiceModalOpen}
          onClose={() => {
            setChoiceModalOpen(false);
            setChoiceModalBooking(null);
          }}
          booking={choiceModalBooking}
          balanceAmount={getBookingRemainingBalance(choiceModalBooking)}
          onSuccess={() => fetchData()}
        />
      )}
    </CustomerDashboardLayout>
  );
}
