import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import useAuth from "../../hooks/useAuth";

const mockMessages = [
  { id: "INQ-024", title: "Wedding - Apr 24", unread: true },
  { id: "EVT-002", title: "Wedding - Apr 10", unread: true },
  { id: "INQ-514", title: "Party - May 12", unread: false }
];

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    CustomerAPI.getInquiries().then((res) => setInquiries(res.data)).catch(() => setInquiries([]));
    CustomerAPI.getBookings().then((res) => setBookings(res.data)).catch(() => setBookings([]));
  }, []);

  const now = useMemo(() => new Date(), []);
  const activeInquiries = inquiries.filter((inq) => inq.status === "pending" || inq.status === "quoted");
  const upcomingBookings = bookings.filter((b) => b.status === "active" && new Date(b.event_date) >= now);
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const unreadCount = mockMessages.filter((m) => m.unread).length;

  const nextEvent = upcomingBookings[0];

  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "";

  return (
    <CustomerDashboardLayout
      title={`Welcome back${firstName ? ", " + firstName : ""}!`}
      subtitle="Here's an overview of your events and inquiries"
    >
      <div className="dash-stats">
        <div className="dash-stat">
          <div className="dash-stat-icon">I</div>
          <div>
            <p>Active Inquiries</p>
            <h3>{activeInquiries.length}</h3>
          </div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-icon">E</div>
          <div>
            <p>Upcoming Events</p>
            <h3>{upcomingBookings.length}</h3>
          </div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-icon">M</div>
          <div>
            <p>Unread Messages</p>
            <h3>{unreadCount}</h3>
          </div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-icon">C</div>
          <div>
            <p>Completed Events</p>
            <h3>{completedBookings.length}</h3>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-tile">
          <div className="dash-tile-header">
            <h3>Upcoming Event</h3>
            <span className="action-link" onClick={() => navigate("/customer/bookings")}>View All →</span>
          </div>
          {nextEvent ? (
            <div className="dash-event">
              <div className="dash-event-title">
                <div>
                  <strong>{nextEvent.event_type || "Event"}</strong>
                  <div className="dash-event-id">{nextEvent.reference || nextEvent._id || ""}</div>
                </div>
                <span className="status-pill">{nextEvent.status}</span>
              </div>
              <div className="dash-event-meta">
                <div>
                  <span className="meta-label">Date & Time</span>
                  <span>
                    {nextEvent.event_date ? new Date(nextEvent.event_date).toLocaleDateString() : "TBD"}
                  </span>
                </div>
                <div>
                  <span className="meta-label">Venue</span>
                  <span>{nextEvent.venue_type || ""}</span>
                </div>
                <div>
                  <span className="meta-label">Package</span>
                  <span>{nextEvent.package_name || nextEvent.service_type || ""}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="dash-empty">No upcoming events yet.</p>
          )}
        </div>

        <div className="dash-tile">
          <div className="dash-tile-header">
            <h3>Pending Inquiries</h3>
            <span className="action-link" onClick={() => navigate("/customer/inquiries")}>View All →</span>
          </div>
          <div className="dash-inquiry-list">
            {activeInquiries.slice(0, 2).map((inq) => (
              <div key={inq._id} className="dash-inquiry-card">
                <div>
                  <strong>{inq.event_type || "Inquiry"}</strong>
                  <div className="dash-inquiry-meta">
                    Event Date: {inq.event_date ? new Date(inq.event_date).toLocaleDateString() : "TBD"}
                  </div>
                </div>
                <div className="dash-inquiry-actions">
                  <span className="pill">{inq.status}</span>
                  {inq.status === "quoted" && (
                    <button
                      className="action-link"
                      type="button"
                      onClick={() => navigate("/customer/inquiries", { state: { openQuoteId: inq._id } })}
                    >
                      View Quote
                    </button>
                  )}
                </div>
              </div>
            ))}
            {activeInquiries.length === 0 && <p className="dash-empty">No pending inquiries.</p>}
          </div>
        </div>

        <div className="dash-tile">
          <div className="dash-tile-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="dash-actions">
            <button className="dash-action" type="button" onClick={() => navigate("/customer/quote")}>
              <div>
                <strong>Request Custom Quote</strong>
                <span>Get a personalized quote</span>
              </div>
              <span>→</span>
            </button>
            <button className="dash-action" type="button" onClick={() => navigate("/customer/messages")}>
              <div>
                <strong>View Messages</strong>
                <span>{unreadCount} unread messages</span>
              </div>
              <span>→</span>
            </button>
            <button className="dash-action" type="button" onClick={() => navigate("/customer/bookings")}>
              <div>
                <strong>Event History</strong>
                <span>View past events</span>
              </div>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
