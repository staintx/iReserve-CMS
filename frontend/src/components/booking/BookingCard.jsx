import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { useConfirm } from "../feedback/confirmContext";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import OcularDatePickerModal from "../customer/OcularDatePickerModal";
import RecordCard from "../customer/portal/RecordCard";
import DetailGrid from "../customer/portal/DetailGrid";
import StateNotice from "../customer/portal/StateNotice";
import {
  bookingStatusMeta,
  recordTitle,
  resolveServiceType,
  serviceIcon,
} from "../customer/portal/statusMeta";
import { ACTION_PAY, ACTION_MESSAGE, ACTION_DANGER } from "../customer/portal/actionStyles";
import { formatCurrency, formatEventDateTime, formatShortDate } from "../../utils/format";
import {
  Settings,
  Eye,
  Calendar,
  Send,
  TrendingUp,
  MessageSquare,
  CreditCard,
  XCircle,
  UserPlus,
} from "lucide-react";

export default function BookingCard({
  booking,
  payments = [],
  startPayment,
  setUpgradingBooking,
  openChangeRequest,
  setAddingGuestsBooking,
  openCatererChat,
  onBookingUpdate
}) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const confirm = useConfirm();
  const [expanded, setExpanded] = useState(false);

  // Ocular schedule form state
  const [showOcularForm, setShowOcularForm] = useState(false);
  const [ocularDate, setOcularDate] = useState("");
  const [ocularTime, setOcularTime] = useState("");
  const [isRequestingOcular, setIsRequestingOcular] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const serviceType = resolveServiceType(booking);
  const isFoodOnly = serviceType === "Food Only";

  // Financial calculations
  const paidAmount = useMemo(() => {
    return payments
      .filter((p) => String(p.booking_id?._id || p.booking_id) === String(booking._id) && p.status === "approved")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [booking, payments]);

  const total = Number(booking.total_price || 0);
  const displayPaid = total > 0 ? Math.min(paidAmount, total) : paidAmount;
  const balance = Math.max(0, total - displayPaid);
  const isFullyPaid = balance <= 0 && total > 0;

  const rawStatus = (booking.status || "").toLowerCase();
  const isCancelled = rawStatus === "cancelled";
  const isClosed = isCancelled || rawStatus === "completed";
  const status = bookingStatusMeta(booking, { balance });

  // Ocular Visit Request Handler
  const handleOcularRequest = async (selectedDate, selectedTime) => {
    if (!selectedDate) {
      notify("Please select a date for the ocular visit.", "error");
      return;
    }
    try {
      setIsRequestingOcular(true);
      await CustomerAPI.requestOcular(booking._id, {
        scheduled_date: selectedDate,
        scheduled_time: selectedTime
      });
      notify("Ocular visit schedule requested.", "success");
      setShowOcularForm(false);
      if (onBookingUpdate) onBookingUpdate();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to request ocular visit.", "error");
    } finally {
      setIsRequestingOcular(false);
    }
  };

  // Cancellation Request Handler
  const handleCancellationRequest = async () => {
    await confirm({
      tone: "destructive",
      title: "Request cancellation for this booking?",
      description:
        "This sends a cancellation request to our team for review. Your booking stays active until they act on it, and anything already paid is handled separately.",
      confirmLabel: "Request cancellation",
      cancelLabel: "Keep booking",
      onConfirm: async () => {
        setIsCancelling(true);
        try {
          await CustomerAPI.requestCancellation(booking._id);
          notify("Cancellation request sent", "success", {
            description: "Our team will review it and get back to you.",
          });
          if (onBookingUpdate) onBookingUpdate();
        } finally {
          setIsCancelling(false);
        }
      },
    });
  };

  const refCode = booking.reference || `BK-${booking._id.substring(0, 6).toUpperCase()}`;
  const packageName = booking.package_id?.name || "Custom Catering";

  // The single most important number: what is still owed, or that nothing is.
  const amount = (() => {
    if (isCancelled || total <= 0) return null;
    if (balance > 0) {
      return {
        label: "Amount due",
        value: formatCurrency(balance),
        tone: "warning",
        // Only worth the extra line once part of it has actually been paid.
        hint: displayPaid > 0 ? `${formatCurrency(displayPaid)} paid so far` : null,
      };
    }
    return { label: "Paid in full", value: formatCurrency(total), tone: "success" };
  })();

  // One obvious primary action per state.
  const primaryAction = (() => {
    if (["deposit pending", "pending deposit", "customer_accepted"].includes(rawStatus)) {
      return (
        <Button onClick={() => startPayment(booking, false)} className={cn("w-full sm:w-auto", ACTION_PAY)}>
          <CreditCard className="h-4 w-4" /> Pay Deposit
        </Button>
      );
    }
    if (["confirmed", "converted to booking", "preparing", "ocular scheduled"].includes(rawStatus) && balance > 0) {
      return (
        <Button onClick={() => startPayment(booking, true)} className={cn("w-full sm:w-auto", ACTION_PAY)}>
          <CreditCard className="h-4 w-4" /> Pay Remaining Balance
        </Button>
      );
    }
    return null;
  })();

  const details = (
    <div className="space-y-5">
      <DetailGrid
        title="Booking details"
        items={[
          { label: "Reference number", value: refCode, mono: true },
          { label: "Service", value: serviceType },
          { label: "Package", value: packageName },
          { label: "Guests", value: booking.guest_count ? `${booking.guest_count} guests` : "—" },
          booking.is_revised && {
            label: "Revision",
            value: `Version ${booking.revision_count || 1}`,
          },
        ]}
      />

      <DetailGrid
        title="Payment"
        className="border-t border-border pt-4"
        items={[
          { label: "Total cost", value: formatCurrency(total) },
          { label: "Paid so far", value: formatCurrency(displayPaid) },
          {
            label: "Remaining balance",
            value: isFullyPaid ? "Fully paid" : formatCurrency(balance),
          },
        ]}
      />

      {/* Pending change request */}
      {booking.change_request?.status === "pending" && booking.change_request?.message && (
        <StateNotice tone="info" icon={Send} title="Change request under review.">
          {booking.change_request.message}
          {booking.change_request.requested_at && (
            <span className="mt-1 block text-xs opacity-80">
              Sent {formatShortDate(booking.change_request.requested_at)}
            </span>
          )}
        </StateNotice>
      )}

      {/* Site visit scheduling — setup events only */}
      {!isFoodOnly && ["confirmed", "converted to booking"].includes(rawStatus) && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Calendar className="h-4 w-4 text-primary" aria-hidden="true" /> Site visit schedule
            </span>

            {booking.ocular_visit?.scheduled_date ? (
              <span className="text-sm text-muted-foreground">
                {formatShortDate(booking.ocular_visit.scheduled_date)} {booking.ocular_visit.scheduled_time || ""}
              </span>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setShowOcularForm(true)}>
                Request a date
              </Button>
            )}
          </div>

          {showOcularForm && (
            <OcularDatePickerModal
              open={showOcularForm}
              onClose={() => setShowOcularForm(false)}
              onSubmit={(date, time) => handleOcularRequest(date, time)}
              initialDate={ocularDate}
              initialTime={ocularTime}
              submitting={isRequestingOcular}
              eventTitle={recordTitle(booking)}
            />
          )}
        </div>
      )}
    </div>
  );

  const secondaryActions = (
    <>
      <Button variant="outline" size="sm" onClick={() => navigate(`/customer/bookings/${booking._id}`)}>
        <Eye className="h-4 w-4" /> View full booking
      </Button>

      {openCatererChat && (
        <Button variant="outline" size="sm" onClick={openCatererChat} className={ACTION_MESSAGE}>
          <MessageSquare className="h-4 w-4" /> Message us
        </Button>
      )}

      {!isClosed && setAddingGuestsBooking && (
        <Button variant="outline" size="sm" onClick={() => setAddingGuestsBooking(booking)}>
          <UserPlus className="h-4 w-4" /> Add guests
        </Button>
      )}

      {!isClosed && openChangeRequest && (
        <Button variant="outline" size="sm" onClick={openChangeRequest}>
          <Settings className="h-4 w-4" /> Request a change
        </Button>
      )}

      {!isClosed && setUpgradingBooking && (
        <Button variant="outline" size="sm" onClick={() => setUpgradingBooking(booking)}>
          <TrendingUp className="h-4 w-4" /> Upgrade package
        </Button>
      )}

      {!isClosed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancellationRequest}
          disabled={isCancelling || booking.change_request?.status === "pending"}
          className={cn(ACTION_DANGER, "sm:ml-auto")}
        >
          <XCircle className="h-4 w-4" /> {isCancelling ? "Processing…" : "Cancel booking"}
        </Button>
      )}
    </>
  );

  return (
    <RecordCard
      icon={serviceIcon(serviceType)}
      title={recordTitle(booking)}
      status={{ tone: status.tone, label: status.label, icon: status.icon }}
      meta={[
        formatEventDateTime(booking.event_date, booking.start_time),
        serviceType,
        booking.is_revised ? `Revised · v${booking.revision_count || 1}` : null,
      ]}
      amount={amount}
      notice={status.notice}
      primaryAction={primaryAction}
      details={details}
      secondaryActions={secondaryActions}
      expanded={expanded}
      onToggle={() => setExpanded((value) => !value)}
      quiet={isCancelled}
    />
  );
}
