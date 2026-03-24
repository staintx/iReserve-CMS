import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import Modal from "../../components/common/Modal";

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return "TBD";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "TBD";
  return `PHP ${amount.toLocaleString()}`;
};

export default function CustomerInquiries() {
  const navigate = useNavigate();
  const location = useLocation();
  const [inquiries, setInquiries] = useState([]);
  const [activeQuote, setActiveQuote] = useState(null);
  const { notify } = useToast();

  const load = () => {
    CustomerAPI.getInquiries()
      .then((res) => setInquiries(res.data))
      .catch(() => setInquiries([]));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!location.state?.openQuoteId) return;
    const match = inquiries.find((inq) => inq._id === location.state.openQuoteId);
    if (match) setActiveQuote(match);
  }, [inquiries, location.state]);

  const cancelInquiry = (id) => {
    CustomerAPI.cancelInquiry(id)
      .then(() => {
        notify("Inquiry cancelled.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not cancel the inquiry. Please try again.", "error"));
  };

  const openQuote = (inq) => {
    if (!inq?.quote_amount && !inq?.quote_notes && !inq?.menu_items?.length && !inq?.service_items?.length && !inq?.package_amount) {
      notify("No quote details yet. Please wait for the admin's quote.", "error");
      return;
    }
    setActiveQuote(inq);
  };

  const closeQuote = () => setActiveQuote(null);

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
                <button className="btn-outline" type="button" onClick={() => navigate("/customer/messages")}>Message</button>
                {inq.status !== "cancelled" && (
                  <button className="btn-danger" type="button" onClick={() => cancelInquiry(inq._id)}>Cancel</button>
                )}
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
                <div>{inq.service_type || (inq.include_food ? "Food & Event" : "Event Setup")}</div>
              </div>
              <div>
                <small>Contact</small>
                <div>{inq.contact_phone || "-"}</div>
              </div>
            </div>
            <div className="actions" style={{ marginTop: "12px" }}>
              <button className="btn" type="button" onClick={() => navigate("/customer/messages")}>Send Message</button>
              {inq.quote_amount ? (
                <button className="btn-outline" type="button" onClick={() => openQuote(inq)}>View Quoted</button>
              ) : (
                <span className="pill">Wait for Quote</span>
              )}
            </div>
          </div>
        ))}
        {inquiries.length === 0 && <div className="tile">No inquiries yet.</div>}
      </div>

      {activeQuote && (() => {
        const menuItems = Array.isArray(activeQuote.menu_items) ? activeQuote.menu_items : [];
        const serviceItems = Array.isArray(activeQuote.service_items) ? activeQuote.service_items : [];
        const menuTotal = menuItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
        const serviceTotal = serviceItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
        const packageAmount = Number(activeQuote.package_amount || 0);
        const computedTotal = packageAmount + menuTotal + serviceTotal;
        const totalAmount = Number(activeQuote.quote_amount || computedTotal || 0);
        const depositAmount = totalAmount * 0.2;

        return (
          <Modal title="Quote Details" onClose={closeQuote} className="modal-wide">
            <div className="quote-card">
              <div className="quote-section">
                <h3>Select Package</h3>
                <p>
                  {activeQuote.package_id?.name || "Custom Package"} {activeQuote.service_type ? `(${activeQuote.service_type})` : ""}
                </p>
              </div>

              <div className="quote-section">
                <h3>Contact Information</h3>
                <div className="quote-info-grid">
                  <div className="info-line">
                    <span className="info-label">First Name:</span>
                    <span>{activeQuote.contact_first_name || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Phone Number:</span>
                    <span>{activeQuote.contact_phone || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Last Name:</span>
                    <span>{activeQuote.contact_last_name || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Alternative Phone Number:</span>
                    <span>{activeQuote.contact_alt_phone || "N/A"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Email Address:</span>
                    <span>{activeQuote.contact_email || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Preferred Contact Method:</span>
                    <span>{activeQuote.contact_method || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="quote-section">
                <h3>Event & Venue Information</h3>
                <div className="quote-grid">
                  <div className="info-line">
                    <span className="info-label">Event Type:</span>
                    <span>{activeQuote.event_type || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Event Theme or Colors:</span>
                    <span>{activeQuote.event_theme || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Event Date:</span>
                    <span>{activeQuote.event_date ? new Date(activeQuote.event_date).toLocaleDateString() : "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Event Start Time:</span>
                    <span>{activeQuote.start_time || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Estimated Guest Count:</span>
                    <span>{activeQuote.guest_count || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Event Duration (hours):</span>
                    <span>{activeQuote.duration_hours || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Venue Type:</span>
                    <span>{activeQuote.venue_type || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">In-door or Out-door:</span>
                    <span>{activeQuote.indoor_outdoor || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Province:</span>
                    <span>{activeQuote.province || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Municipality:</span>
                    <span>{activeQuote.municipality || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Barangay:</span>
                    <span>{activeQuote.barangay || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Street Name:</span>
                    <span>{activeQuote.street || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">Landmark:</span>
                    <span>{activeQuote.landmark || "-"}</span>
                  </div>
                  <div className="info-line">
                    <span className="info-label">ZIP Code:</span>
                    <span>{activeQuote.zip_code || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="quote-section">
                <h3>Menu Option</h3>
                {menuItems.length > 0 ? (
                  <div className="quote-grid">
                    <div className="quote-row quote-row-head">
                      <span>Menu Item</span>
                      <span>Note</span>
                      <span>Input Price</span>
                    </div>
                    {menuItems.map((item) => (
                      <div key={item.name} className="quote-row">
                        <div className="quote-menu">
                          {item.image_url ? <img src={item.image_url} alt={item.name} /> : <div className="thumb" />}
                          <span>{item.name}</span>
                        </div>
                        <span>{item.note || "-"}</span>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dash-empty">No menu items quoted yet.</p>
                )}
              </div>

              <div className="quote-section">
                <h3>Additional Services</h3>
                {serviceItems.length > 0 ? (
                  <div className="quote-grid">
                    <div className="quote-row quote-row-head">
                      <span>Service</span>
                      <span>Quantity</span>
                      <span>Input Price</span>
                    </div>
                    {serviceItems.map((item) => (
                      <div key={item.name} className="quote-row">
                        <span>{item.name}</span>
                        <span>{item.quantity || 0}</span>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dash-empty">No additional services quoted yet.</p>
                )}
              </div>

              <div className="quote-section">
                <h3>Special Request or Notes</h3>
                <p>{activeQuote.quote_notes || activeQuote.special_requests || "N/A"}</p>
              </div>

              <div className="quote-section">
                <h3>Pricing & Computation</h3>
                <div className="quote-payment">
                  <span>Payment Method:</span>
                  <span>{activeQuote.payment_method || "TBD"}</span>
                </div>
                <div className="quote-summary">
                  <div className="summary-title">Quotation Summary</div>
                  <div className="summary-line">
                    <span>Selected Package</span>
                    <strong>{formatCurrency(packageAmount)}</strong>
                  </div>
                  <div className="summary-block">
                    <div className="summary-head">Food Menu</div>
                    {menuItems.length > 0 ? menuItems.map((item) => (
                      <div key={`${item.name}-summary`} className="summary-line small">
                        <span>{item.name}</span>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                    )) : (
                      <div className="summary-line small">
                        <span>No menu items</span>
                        <span>—</span>
                      </div>
                    )}
                  </div>
                  <div className="summary-block">
                    <div className="summary-head">Setup</div>
                    {serviceItems.length > 0 ? serviceItems.map((item) => (
                      <div key={`${item.name}-service`} className="summary-line small">
                        <span>{item.name} x {item.quantity || 0}</span>
                        <span>{formatCurrency(item.price)}</span>
                      </div>
                    )) : (
                      <div className="summary-line small">
                        <span>No services</span>
                        <span>—</span>
                      </div>
                    )}
                  </div>
                  <div className="summary-total">
                    <span>Grand Total</span>
                    <strong>{formatCurrency(totalAmount)}</strong>
                  </div>
                  <div className="summary-deposit">
                    Deposit (20% of Total): {formatCurrency(depositAmount)}
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </CustomerDashboardLayout>
  );
}
