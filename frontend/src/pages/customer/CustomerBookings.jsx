import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import DashboardStatCard from "../../components/dashboard/DashboardStatCard";
import useToast from "../../hooks/useToast";
import Modal from "../../components/common/Modal";

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  return `PHP ${Number(value).toLocaleString()}`;
};

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export default function CustomerBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payingBookingId, setPayingBookingId] = useState(null);
  const [requestingBooking, setRequestingBooking] = useState(null);
  const [requestNote, setRequestNote] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [addingGuestsBooking, setAddingGuestsBooking] = useState(null);
  const [additionalGuests, setAdditionalGuests] = useState(0);
  const [isSubmittingGuests, setIsSubmittingGuests] = useState(false);
  
  const [upgradingBooking, setUpgradingBooking] = useState(null);
  const [packages, setPackages] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  const { notify } = useToast();

  useEffect(() => {
    CustomerAPI.getBookings().then((res) => setBookings(res.data)).catch(() => setBookings([]));
    CustomerAPI.getPayments().then((res) => setPayments(res.data)).catch(() => setPayments([]));
    CustomerAPI.getPackages().then((res) => setPackages(res.data)).catch(() => setPackages([]));
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
    () => payments.filter(p => p.status === "approved").reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments]
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

    setPayingBookingId(booking._id);
    navigate("/customer/checkout", {
      state: {
        bookingId: booking._id,
        amount,
        paymentType: isBalance ? "balance" : "deposit"
      }
    });
  };

  const openChangeRequest = () => {
    if (!nextEvent) return;
    setRequestingBooking(nextEvent);
    setRequestNote(nextEvent.change_request?.message || "");
  };

  const openCatererChat = async () => {
    if (!nextEvent?._id) return;

    try {
      const conversation = await createConversation({ booking_id: nextEvent._id });
      navigate(`/customer/messages/${conversation._id}`);
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        notify(error.response?.data?.message || "This booking is not ready for chat yet.", "error");
        return;
      }
      notify(error.response?.data?.message || "We could not open the conversation.", "error");
    }
  };


  const submitAddGuests = async (event) => {
    event.preventDefault();
    if (!addingGuestsBooking) return;
    if (additionalGuests <= 0) {
      notify("Please enter a valid number of guests to add.", "error");
      return;
    }

    try {
      setIsSubmittingGuests(true);
      const response = await CustomerAPI.addGuests(addingGuestsBooking._id, { additional_guests: additionalGuests });
      
      notify("Guests added successfully. Redirecting to payment...", "success");
      
      if (response.data.checkout_url) {
        window.location.assign(response.data.checkout_url);
      } else {
        setAddingGuestsBooking(null);
        setAdditionalGuests(0);
        // Refresh
        const bRes = await CustomerAPI.getBookings();
        setBookings(bRes.data);
      }
    } catch (error) {
      notify(error.response?.data?.message || "We could not add guests. Please try again.", "error");
    } finally {
      setIsSubmittingGuests(false);
    }
  };

  const submitUpgrade = async (event) => {
    event.preventDefault();
    if (!upgradingBooking) return;
    if (!selectedPackageId) {
      notify("Please select a package to upgrade to.", "error");
      return;
    }

    try {
      setIsSubmittingUpgrade(true);
      const response = await CustomerAPI.upgradeBooking(upgradingBooking._id, { new_package_id: selectedPackageId });
      
      notify("Package upgraded! Redirecting to payment...", "success");
      
      if (response.data.checkout_url) {
        window.location.assign(response.data.checkout_url);
      }
    } catch (error) {
      notify(error.response?.data?.message || "Could not upgrade package.", "error");
    } finally {
      setIsSubmittingUpgrade(false);
    }
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
        <div className="table-card" style={{ padding: "24px" }}>
          <div className="tile-header" style={{ borderBottom: "1px solid #eee", paddingBottom: "16px", marginBottom: "20px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{nextEvent.event_type}</h3>
              <small style={{ color: "#666" }}>Ref: {nextEvent._id}</small>
            </div>
            <span className={`badge ${nextEvent.status === "confirmed" ? "confirmed" : "pending"}`}>{nextEvent.status}</span>
          </div>

          <div className="grid sm:grid-cols-4" style={{ gap: "20px", marginBottom: "24px" }}>
            <div>
              <small style={{ color: "#6b7280", fontWeight: 500, textTransform: "uppercase", fontSize: "0.75rem" }}>Date & Time</small>
              <div style={{ fontWeight: 500 }}>{new Date(nextEvent.event_date).toLocaleDateString()} at {nextEvent.start_time || "TBD"}</div>
            </div>
            <div>
              <small style={{ color: "#6b7280", fontWeight: 500, textTransform: "uppercase", fontSize: "0.75rem" }}>Venue</small>
              <div style={{ fontWeight: 500 }}>{nextEvent.venue_type || "TBD"}</div>
            </div>
            <div>
              <small style={{ color: "#6b7280", fontWeight: 500, textTransform: "uppercase", fontSize: "0.75rem" }}>Package</small>
              <div style={{ fontWeight: 500 }}>{nextEvent.package_id?.name || "Custom Build"}</div>
            </div>
            <div>
              <small style={{ color: "#6b7280", fontWeight: 500, textTransform: "uppercase", fontSize: "0.75rem" }}>Guests</small>
              <div style={{ fontWeight: 500 }}>{nextEvent.guest_count}</div>
            </div>
          </div>

          <div className="tile" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "20px", borderRadius: "8px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <strong style={{ fontSize: "1.1rem" }}>Financial Summary</strong>
              {nextEventBalance <= 0 && <span className="badge confirmed">Fully Paid ✅</span>}
            </div>
            <div className="grid sm:grid-cols-3" style={{ gap: "16px" }}>
              <div>
                <small style={{ color: "#6b7280" }}>Total Cost</small>
                <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{formatCurrency(nextEvent.total_price)}</div>
              </div>
              <div>
                <small style={{ color: "#6b7280" }}>Amount Paid</small>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#16a34a" }}>{formatCurrency(nextEventPaid)}</div>
              </div>
              <div>
                <small style={{ color: "#6b7280" }}>Remaining Balance</small>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, color: nextEventBalance > 0 ? "#dc2626" : "#64748b" }}>
                  {formatCurrency(nextEventBalance)}
                </div>
              </div>
            </div>
          </div>

          <div className="actions" style={{ display: "flex", gap: "12px", flexWrap: "wrap", borderTop: "1px solid #eee", paddingTop: "20px" }}>
            {nextEventBalance > 0 && (
              <button
                className="btn"
                type="button"
                onClick={() => startPayment(nextEvent, nextEventPaid > 0)}
                disabled={payingBookingId === nextEvent._id}
              >
                {payingBookingId === nextEvent._id ? "Opening PayMongo..." : "Pay Balance"}
              </button>
            )}
            <button className="btn-outline" type="button" onClick={() => setUpgradingBooking(nextEvent)} disabled={!canRequestChange}>
              Upgrade Package
            </button>
            <button className="btn-outline" type="button" onClick={() => setAddingGuestsBooking(nextEvent)} disabled={!canRequestChange}>
              Add Guests
            </button>
            <button className="btn-outline" type="button" onClick={openChangeRequest} disabled={!canRequestChange}>
              {nextEventChangeRequested ? "Change Request Pending" : "Request Changes"}
            </button>
            <button className="btn-outline" type="button" onClick={openCatererChat} style={{ marginLeft: "auto" }}>
              Message Caterer
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

      {addingGuestsBooking && (
        <Modal title="Add Guests" onClose={() => setAddingGuestsBooking(null)}>
          <form onSubmit={submitAddGuests}>
            <p style={{ marginTop: 0 }}>
              You currently have <strong>{addingGuestsBooking.guest_count}</strong> guests.
              Adding more guests costs <strong>₱500 per head</strong>. This will generate a payment link for the difference.
            </p>
            <label className="form-label" htmlFor="additional-guests">
              Additional Guests to Add
            </label>
            <input
              id="additional-guests"
              type="number"
              min="1"
              className="form-input"
              value={additionalGuests}
              onChange={(e) => setAdditionalGuests(Number(e.target.value))}
            />
            
            {additionalGuests > 0 && (
              <div style={{ marginTop: "15px", padding: "10px", background: "#f8f9fa", borderRadius: "5px" }}>
                <strong>Amount Due: </strong> ₱{(additionalGuests * 500).toLocaleString()}
              </div>
            )}

            {!canRequestChange && (
              <p style={{ color: "#b45309", marginTop: "12px" }}>
                Guest additions are locked within 3 days of the event.
              </p>
            )}
            <div className="actions" style={{ justifyContent: "flex-end", marginTop: "20px" }}>
              <button className="btn-outline" type="button" onClick={() => setAddingGuestsBooking(null)}>
                Cancel
              </button>
              <button className="btn" type="submit" disabled={isSubmittingGuests || !canRequestChange || additionalGuests <= 0}>
                {isSubmittingGuests ? "Processing..." : "Pay Difference"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {upgradingBooking && (
        <Modal title="Upgrade Package" onClose={() => setUpgradingBooking(null)}>
          <form onSubmit={submitUpgrade}>
            <p style={{ marginTop: 0 }}>
              Current Package: <strong>{upgradingBooking.package_id?.name || "Custom"}</strong>. 
              Select a new package to upgrade to. You will be redirected to pay the price difference.
            </p>
            <label className="form-label" htmlFor="upgrade-package">
              Select New Package
            </label>
            <select
              id="upgrade-package"
              className="form-input"
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              required
            >
              <option value="">-- Choose a Package --</option>
              {packages.map(pkg => (
                <option key={pkg._id} value={pkg._id}>
                  {pkg.name} (₱{Number(pkg.price).toLocaleString()})
                </option>
              ))}
            </select>
            
            {!canRequestChange && (
              <p style={{ color: "#b45309", marginTop: "12px" }}>
                Upgrades are locked within 3 days of the event.
              </p>
            )}
            <div className="actions" style={{ justifyContent: "flex-end", marginTop: "20px" }}>
              <button className="btn-outline" type="button" onClick={() => setUpgradingBooking(null)}>
                Cancel
              </button>
              <button className="btn" type="submit" disabled={isSubmittingUpgrade || !canRequestChange || !selectedPackageId}>
                {isSubmittingUpgrade ? "Processing..." : "Pay Difference"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {requestingBooking && (
        <Modal title="Request booking change" onClose={() => setRequestingBooking(null)}>
          <form onSubmit={submitChangeRequest}>
            <p style={{ marginTop: 0 }}>
              Describe the booking details you want changed. 
              <strong> Note: Sensitive actions such as Date Change, Venue Change, Downgrades, or Full Cancellations require Admin approval.</strong>
              The admin will review your request and process custom refunds or new quotes if applicable.
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
