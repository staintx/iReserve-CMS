import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";

export default function CustomerInquiries() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);

  useEffect(() => {
    CustomerAPI.getInquiries().then((res) => setInquiries(res.data)).catch(() => setInquiries([]));
  }, []);

  return (
    <CustomerDashboardLayout
      title="My Inquiries"
      subtitle="Track all your pending inquiries"
    >
      <div className="customer-form-grid">
        {inquiries.map((inq) => (
          <div key={inq._id} className="table-card">
            <div className="tile-header">
              <div>
                <strong>{inq.event_type}</strong>
                <div><small>Submitted on {inq.createdAt ? new Date(inq.createdAt).toLocaleDateString() : ""}</small></div>
              </div>
              <div className="actions">
                <button className="btn-outline" type="button">Edit</button>
                <button className="btn-danger" type="button">Cancel</button>
              </div>
            </div>
            <div className="grid sm:grid-cols-5">
              <div>
                <small>Event Type</small>
                <div>{inq.event_type}</div>
              </div>
              <div>
                <small>Event Date</small>
                <div>{inq.event_date ? new Date(inq.event_date).toLocaleDateString() : ""}</div>
              </div>
              <div>
                <small>Venue Type</small>
                <div>{inq.venue_type || "-"}</div>
              </div>
              <div>
                <small>Service Type</small>
                <div>{inq.include_food ? "Food & Event" : "Event Setup"}</div>
              </div>
              <div>
                <small>Contact</small>
                <div>{inq.contact_phone || "-"}</div>
              </div>
            </div>
            <div className="actions" style={{ marginTop: "12px" }}>
              <button className="btn" type="button" onClick={() => navigate("/customer/messages")}>Send Message</button>
              {inq.quote_amount ? (
                <button className="btn-outline" type="button">View Quoted</button>
              ) : (
                <span className="pill">Wait for Quote</span>
              )}
            </div>
          </div>
        ))}
        {inquiries.length === 0 && <div className="tile">No inquiries yet.</div>}
      </div>
    </CustomerDashboardLayout>
  );
}
