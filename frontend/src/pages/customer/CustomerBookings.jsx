import { useEffect, useMemo, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import DashboardStatCard from "../../components/dashboard/DashboardStatCard";

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  return `PHP ${Number(value).toLocaleString()}`;
};

export default function CustomerBookings() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    CustomerAPI.getBookings().then((res) => setBookings(res.data)).catch(() => setBookings([]));
  }, []);

  const upcoming = useMemo(
    () => bookings.filter((b) => b.status === "active"),
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
            <span className="badge confirmed">Confirmed</span>
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
                <small>Deposit Paid</small>
                <div>PHP 0</div>
              </div>
              <div>
                <small>Balance Due</small>
                <div>{formatCurrency(nextEvent.total_price)}</div>
              </div>
              <div>
                <small>Status</small>
                <div className="badge pending">On Going</div>
              </div>
            </div>
          </div>
          <div className="actions">
            <button className="btn" type="button">Message Caterer</button>
            <button className="btn-outline" type="button">Pay Balance</button>
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
    </CustomerDashboardLayout>
  );
}
