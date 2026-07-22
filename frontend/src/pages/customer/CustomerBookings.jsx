import { useEffect, useMemo, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import DashboardStatCard from "../../components/dashboard/DashboardStatCard";
import useToast from "../../hooks/useToast";
import Modal from "../../components/common/Modal";

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  return `PHP ${Number(value).toLocaleString()}`;
};

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function CustomerBookings() {
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [requestingBooking, setRequestingBooking] = useState(null);
  const [requestNote, setRequestNote] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    CustomerAPI.getBookings().then((res) => setBookings(res.data)).catch(() => setBookings([]));
    CustomerAPI.getPayments().then((res) => setPayments(res.data)).catch(() => setPayments([]));
  }, []);

  const upcoming = useMemo(
    () => bookings.filter((b) => ["pending deposit", "confirmed", "preparing", "ongoing"].includes(b.status)),
    [bookings]
  );
  const completed = useMemo(
    () => bookings.filter((b) => b.status === "completed"),
    [bookings]
  );
  const totalSpent = useMemo(
    () => completed.reduce((sum, item) => sum + (item.total_price || 0), 0),
    [completed]
  );

  const nextEvent = upcoming[0];
  const nextEventChangeRequested = nextEvent?.change_request?.status === "pending";

  const canRequestChange = useMemo(() => {
    if (!nextEvent?.event_date) return false;
    const msUntilEvent = new Date(nextEvent.event_date).getTime() - Date.now();
    return msUntilEvent > THREE_DAYS_MS;
  }, [nextEvent]);

  const nextEventPaid = useMemo(() => {
    if (!nextEvent) return 0;
    return payments
      .filter((p) => String(p.booking_id?._id || p.booking_id) === String(nextEvent._id) && p.status === "approved")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [nextEvent, payments]);

  const nextEventBalance = useMemo(() => {
    if (!nextEvent) return 0;
    const total = Number(nextEvent.total_price || 0);
    return Math.max(0, total - nextEventPaid);
  }, [nextEvent, nextEventPaid]);

  const startPayment = async (booking, isBalance = false) => {
    if (!booking?._id) return;

    let amount = Number(booking.total_price || 0);
    if (isBalance) {
      amount = nextEventBalance;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      notify("This booking does not have a valid payable amount yet.", "error");
      return;
    }

    try {
      setPayingBookingId(booking._id);
      const response = await CustomerAPI.createPaymentCheckout({
        booking_id: booking._id,
        amount,
        payment_type: isBalance ? "balance" : "deposit"
      });
      const checkoutUrl = response.data?.checkout_url;
      if (!checkoutUrl) {
        throw new Error("PayMongo checkout link was not returned.");
      }
      window.location.assign(checkoutUrl);
    } catch (error) {
      notify(error.response?.data?.message || error.message || "We could not start PayMongo checkout. Please try again.", "error");
      setPayingBookingId(null);
    }
  };

  const openChangeRequest = () => {
    if (!nextEvent) return;
    setRequestingBooking(nextEvent);
    setRequestNote(nextEvent.change_request?.message || "");
  };

  const submitChangeRequest = async (event) => {
    event.preventDefault();
    if (!requestingBooking) return;

    const nextMessage = requestNote.trim();
    if (!nextMessage) {
      notify("Please describe the changes you want to request.", "error");
      return;
    }

    try {
      setIsSubmittingRequest(true);
      const response = await CustomerAPI.requestBookingChange(requestingBooking._id, { message: nextMessage });
      setBookings((prev) => prev.map((booking) => (booking._id === response.data._id ? response.data : booking)));
      notify("Your change request was sent to the admin.", "success");
      setRequestingBooking(null);
      setRequestNote("");
    } catch (error) {
      notify(error.response?.data?.message || "We could not send your change request.", "error");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <CustomerDashboardLayout
      title="My Bookings"
      subtitle="Manage your confirmed events"
    >
      <div className="dashboard-cards">
        <DashboardStatCard
          label="Upcoming Events"
          value={upcoming.length}
          helper={nextEvent ? `Next: ${new Date(nextEvent.event_date).toLocaleDateString()}` : null}
        />
        <DashboardStatCard label="Total Spent" value={formatCurrency(totalSpent)} />
        <DashboardStatCard label="Completed Events" value={completed.length} />
      </div>

      {nextEvent && (
        <div className="table-card">
          <div className="tile-header">
            <h3>{nextEvent.event_type}</h3>
            <span className="badge confirmed">{nextEvent.status}</span>
          </div>
          <div className="grid sm:grid-cols-4">
            <div>
              <small>Date & Time</small>
              <div>{new Date(nextEvent.event_date).toLocaleDateString()} {nextEvent.start_time || ""}</div>
            </div>
            <div>
              <small>Venue</small>
              <div>{nextEvent.venue_type || "-"}</div>
            </div>
            <div>
              <small>Package</small>
              <div>{nextEvent.package_id?.name || "Custom"}</div>
            </div>
            <div>
              <small>Guests</small>
              <div>{nextEvent.guest_count}</div>
            </div>
          </div>
          <div className="tile" style={{ marginTop: "12px" }}>
            <strong>Payment Summary</strong>
            <div className="grid sm:grid-cols-4" style={{ marginTop: "10px" }}>
              <div>
                <small>Total Amount</small>
                <div>{formatCurrency(nextEvent.total_price)}</div>
              </div>
              <div>
                <small>Total Paid</small>
                <div>{formatCurrency(nextEventPaid)}</div>
              </div>
              <div>
                <small>Balance Due</small>
                <div>{formatCurrency(nextEventBalance)}</div>
              </div>
              <div>
                <small>Payment Status</small>
                <div className={`badge ${nextEvent.payment_status === "paid" ? "confirmed" : "pending"}`}>{nextEvent.payment_status || "pending"}</div>
              </div>
            </div>
          </div>
          <div className="actions">
            <button className="btn" type="button">Message Caterer</button>
            <button
              className="btn-outline"
              type="button"
              onClick={openChangeRequest}
              disabled={!canRequestChange || nextEventChangeRequested}
            >
              {nextEventChangeRequested ? "Change Request Sent" : canRequestChange ? "Change Booking Information" : "Locked 3 Days Before Event"}
            </button>
            <button
              className="btn-outline"
              type="button"
              onClick={() => startPayment(nextEvent, nextEventPaid > 0)}
              disabled={payingBookingId === nextEvent._id || nextEventBalance <= 0}
            >
              {payingBookingId === nextEvent._id ? "Opening PayMongo..." : nextEventBalance <= 0 ? "Fully Paid" : "Pay Balance"}
            </button>
          </div>
        </div>
      )}

      <div className="table-card" style={{ marginTop: "16px" }}>
        <div className="tile-header">
          <h3>Past Events</h3>
          <span className="action-link">View All</span>
        </div>
        {completed.map((item) => (
          <div key={item._id} className="list-card">
            <div>
              <strong>{item.event_type}</strong>
              <div><small>{item.event_date ? new Date(item.event_date).toLocaleDateString() : ""}</small></div>
            </div>
            <div><small>{formatCurrency(item.total_price)}</small></div>
            <button className="btn-outline" type="button">Write review</button>
          </div>
        ))}
        {completed.length === 0 && <p>No past events yet.</p>}
      </div>

      {requestingBooking && (
        <Modal title="Request booking change" onClose={() => setRequestingBooking(null)}>
          <form onSubmit={submitChangeRequest}>
            <p style={{ marginTop: 0 }}>
              Describe the booking details you want changed. The admin will review your request.
            </p>
            <label className="form-label" htmlFor="booking-change-request">
              Change request
            </label>
            <textarea
              id="booking-change-request"
              className="form-input"
              rows={6}
              value={requestNote}
              onChange={(event) => setRequestNote(event.target.value)}
              placeholder="Example: Please update the guest count to 80 and move the venue to..."
            />
            {!canRequestChange && (
              <p style={{ color: "#b45309", marginBottom: "12px" }}>
                Booking information changes are locked within 3 days of the event.
              </p>
            )}
            <div className="actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn-outline" type="button" onClick={() => setRequestingBooking(null)}>
                Cancel
              </button>
              <button className="btn" type="submit" disabled={isSubmittingRequest || !canRequestChange}>
                {isSubmittingRequest ? "Sending..." : "Send Request"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </CustomerDashboardLayout>
  );
}
