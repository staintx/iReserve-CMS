import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  return `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function BookingCard({
  booking,
  payments,
  canRequestChange,
  startPayment,
  setUpgradingBooking,
  openChangeRequest,
  setAddingGuestsBooking,
  openCatererChat,
  submitAddGuests,
  isSubmittingGuests,
  setAdditionalGuestsGlobal,
}) {
  const navigate = useNavigate();

  // Local state for guest count editing before submit
  const originalGuestCount = booking.guest_count || 0;
  const [editedGuestCount, setEditedGuestCount] = useState(originalGuestCount);
  const additionalGuests = Math.max(0, editedGuestCount - originalGuestCount);
  const hasGuestChange = additionalGuests > 0;

  const paidAmount = useMemo(() => {
    return payments
      .filter((p) => String(p.booking_id?._id || p.booking_id) === String(booking._id) && p.status === "approved")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [booking, payments]);

  const total = Number(booking.total_price || 0);
  const displayPaid = total > 0 ? Math.min(paidAmount, total) : paidAmount;
  const balance = Math.max(0, total - displayPaid);

  const additionalCost = additionalGuests * 500;
  const newTotal = total + additionalCost;

  let statusVariant = "default";
  let statusText = booking.status;

  if (booking.status === "confirmed") {
    statusVariant = "default";
    statusText = "Confirmed";
  } else if (booking.status === "pending deposit") {
    statusVariant = "secondary";
    statusText = "Deposit Pending";
  } else if (booking.status === "pending") {
    statusVariant = "outline";
    statusText = "Pending";
  } else if (booking.status === "cancelled") {
    statusVariant = "destructive";
    statusText = "Cancelled";
  }

  if (booking.ocular_visit && booking.ocular_visit.status === "pending") {
    statusVariant = "outline";
    statusText = "Ocular Pending";
  }

  return (
    <Card 
      className="group mb-4 cursor-pointer overflow-hidden transition-all hover:shadow-md"
      onClick={() => navigate(`/customer/bookings/${booking._id}`)}
    >
      <CardContent className="flex items-center justify-between p-6">
        <div className="flex items-center gap-5">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-accent/20 text-2xl text-accent">
            🍽️
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-3">
              <h3 className="text-lg font-bold text-foreground">
                {booking.event_type === "Other" ? booking.event_type_other : booking.event_type} {booking.guest_count > 0 ? "Event" : ""}
              </h3>
              <Badge variant={statusVariant}>
                {statusText}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="tracking-wider">{booking._id.substring(0, 8).toUpperCase()}</span>
              <span>•</span>
              <span>{booking.event_type}</span>
              <span>•</span>
              <span>{booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "TBD"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-right">
          <div>
            <div className="mb-1 text-lg font-bold text-foreground">{formatCurrency(total)}</div>
            <div className={cn("text-sm font-medium", balance > 0 ? "text-amber-600" : "text-emerald-600")}>
              Balance: {formatCurrency(balance)}
            </div>
          </div>
          <div className="text-muted-foreground transition-transform group-hover:translate-x-1">
            <ChevronRight className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
