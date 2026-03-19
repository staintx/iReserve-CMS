import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import useToast from "../../hooks/useToast";

const buildMenuPricing = (menuItems, inquiry) => {
  const saved = Array.isArray(inquiry?.menu_items) ? inquiry.menu_items : [];
  if (menuItems.length === 0) return saved.map((item) => ({ ...item }));

  return menuItems.map((item) => {
    const existing = saved.find((entry) => entry.name === item.name);
    return {
      name: item.name,
      image_url: item.image_url,
      note: existing?.note || "",
      price: existing?.price ?? ""
    };
  });
};

const buildServicePricing = (inventoryItems, inquiry) => {
  const saved = Array.isArray(inquiry?.service_items) ? inquiry.service_items : [];
  if (inventoryItems.length === 0) return saved.map((item) => ({ ...item }));

  return inventoryItems.map((item) => {
    const existing = saved.find((entry) => entry.name === item.item_name);
    return {
      name: item.item_name,
      quantity: existing?.quantity ?? "",
      price: existing?.price ?? ""
    };
  });
};

export default function AdminInquiryQuote() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [inquiry, setInquiry] = useState(null);
  const [packages, setPackages] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [menuPricing, setMenuPricing] = useState([]);
  const [servicePricing, setServicePricing] = useState([]);
  const [quoteNotes, setQuoteNotes] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [packageAmount, setPackageAmount] = useState("");

  useEffect(() => {
    Promise.all([
      AdminAPI.getInquiry(id),
      AdminAPI.getPackages(),
      AdminAPI.getMenu(),
      AdminAPI.getInventory()
    ])
      .then(([inquiryRes, packageRes, menuRes, inventoryRes]) => {
        const inquiryData = inquiryRes.data;
        setInquiry(inquiryData);
        setPackages(Array.isArray(packageRes.data) ? packageRes.data : []);
        setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
        setInventoryItems(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);
        setQuoteNotes(inquiryData.quote_notes || "");
        setQuoteAmount(inquiryData.quote_amount || "");
        setPaymentMethod(inquiryData.payment_method || "gcash");
        setPackageAmount(inquiryData.package_amount ?? "");
      })
      .catch((err) => {
        notify(err.response?.data?.message || "We could not load the inquiry. Please refresh and try again.", "error");
      });
  }, [id, notify]);

  useEffect(() => {
    if (!inquiry) return;
    setMenuPricing(buildMenuPricing(menuItems, inquiry));
    setServicePricing(buildServicePricing(inventoryItems, inquiry));
  }, [inquiry, menuItems, inventoryItems]);

  const menuTotal = useMemo(
    () => menuPricing.reduce((sum, item) => sum + (Number(item.price) || 0), 0),
    [menuPricing]
  );
  const serviceTotal = useMemo(
    () => servicePricing.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0),
    [servicePricing]
  );
  const computedTotal = menuTotal + serviceTotal;
  const packageDetails = useMemo(() => {
    if (!inquiry) return null;
    return packages.find((item) => item._id === inquiry.package_id) || null;
  }, [inquiry, packages]);

  const packageLabel = useMemo(() => {
    if (!inquiry) return "Custom Package";
    return packageDetails?.name || "Custom Package";
  }, [inquiry, packageDetails]);

  const basePackageAmount = useMemo(() => {
    if (packageLabel !== "Custom Package") {
      return Number(packageDetails?.price_max ?? packageDetails?.price_min ?? 0);
    }
    return Number(packageAmount || 0);
  }, [packageAmount, packageDetails, packageLabel]);

  const computedTotalWithPackage = basePackageAmount + computedTotal;
  const amountValue = Number(quoteAmount || computedTotalWithPackage || 0);
  const depositAmount = amountValue * 0.2;

  const inquiryCode = useMemo(() => {
    if (!inquiry?._id) return "INQ-000";
    const tail = inquiry._id.slice(-3).toUpperCase();
    return `INQ-${tail}`;
  }, [inquiry]);

  const menuSummary = useMemo(() => {
    return menuPricing
      .filter((item) => item.name)
      .map((item) => ({
        label: item.name,
        note: item.note,
        total: Number(item.price) || 0
      }));
  }, [menuPricing]);

  const serviceSummary = useMemo(() => {
    return servicePricing
      .filter((item) => item.name)
      .map((item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        return {
          label: item.name,
          quantity: qty,
          total: qty * price
        };
      });
  }, [servicePricing]);

  const handleQuantityChange = (index, delta) => {
    const next = [...servicePricing];
    const current = Number(next[index].quantity) || 0;
    const updated = Math.max(0, current + delta);
    next[index] = { ...next[index], quantity: updated === 0 ? "" : updated };
    setServicePricing(next);
  };

  const buildPayload = () => {
    const menuPayload = menuPricing.filter((item) => item.name);
    const servicePayload = servicePricing.filter((item) => item.name);

    return {
      quote_amount: amountValue,
      quote_notes: quoteNotes,
      package_amount: basePackageAmount || undefined,
      payment_method: paymentMethod,
      status: "quoted",
      menu_items: menuPayload,
      service_items: servicePayload,
      selected_menu: menuPayload.map((item) => item.name),
      additional_services: servicePayload.map((item) => item.name)
    };
  };

  const saveQuote = () => {
    if (!inquiry) return;
    AdminAPI.updateInquiry(inquiry._id, buildPayload())
      .then(() => notify("Quote saved.", "success"))
      .catch((err) => notify(err.response?.data?.message || "We could not save the quote. Please try again.", "error"));
  };

  const submitBooking = () => {
    if (!inquiry) return;
    const amountValue = Number(quoteAmount || computedTotal || 0);

    AdminAPI.updateInquiry(inquiry._id, { ...buildPayload(), status: "approved" })
      .then(() =>
        AdminAPI.createBookingFromInquiry(inquiry._id, {
          total_price: amountValue,
          package_id: inquiry.package_id || undefined
        })
      )
      .then(() => {
        notify("Booking created.", "success");
        navigate("/admin/bookings/active");
      })
      .catch((err) => {
        const message = err?.response?.data?.message || "We could not create the booking. Please try again.";
        notify(message, "error");
      });
  };

  if (!inquiry) {
    return (
      <AdminLayout>
        <p>Loading inquiry...</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-quote-page">
        <div className="quote-header">
          <button className="btn-ghost" type="button" onClick={() => navigate(-1)}>
            Back
          </button>
          <div className="quote-title">
            <h1>
              Create Quote for {inquiry.contact_first_name || inquiry.customer_id?.full_name || "Client"} {inquiryCode}
            </h1>
          </div>
        </div>

        <div className="quote-card">
          <div className="quote-section">
            <h3>Select Package</h3>
            <p>
              {packageLabel} {inquiry.service_type ? `(${inquiry.service_type})` : ""}
            </p>
            {packageLabel === "Custom Package" && (
              <div className="quote-input-row">
                <label>Custom Package Amount</label>
                <input
                  value={packageAmount}
                  onChange={(e) => setPackageAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
            )}
          </div>

          <div className="quote-section">
            <h3>Contact Information</h3>
            <div className="quote-info-grid">
              <div className="info-line">
                <span className="info-label">First Name:</span>
                <span>{inquiry.contact_first_name || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Phone Number:</span>
                <span>{inquiry.contact_phone || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Last Name:</span>
                <span>{inquiry.contact_last_name || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Alternative Phone Number:</span>
                <span>{inquiry.contact_alt_phone || "N/A"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Email Address:</span>
                <span>{inquiry.contact_email || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Preferred Contact Method:</span>
                <span>{inquiry.contact_method || "-"}</span>
              </div>
            </div>
          </div>

          <div className="quote-section">
            <h3>Event & Venue Information</h3>
            <div className="quote-subtitle">Event Details</div>
            <div className="quote-info-grid">
              <div className="info-line">
                <span className="info-label">Event Type:</span>
                <span>{inquiry.event_type || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Event Theme or Colors:</span>
                <span>{inquiry.event_theme || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Event Date:</span>
                <span>{inquiry.event_date ? new Date(inquiry.event_date).toLocaleDateString() : "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Event Start Time:</span>
                <span>{inquiry.start_time || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Estimated Guest Count:</span>
                <span>{inquiry.guest_count || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Event Duration (hours):</span>
                <span>{inquiry.duration_hours || "-"}</span>
              </div>
            </div>

            <div className="quote-subtitle">Venue Information</div>
            <div className="quote-info-grid">
              <div className="info-line">
                <span className="info-label">Venue Type:</span>
                <span>{inquiry.venue_type || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Province:</span>
                <span>{inquiry.province || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">In-door or Out-door:</span>
                <span>{inquiry.indoor_outdoor || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Municipality:</span>
                <span>{inquiry.municipality || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Estimated Guest Count:</span>
                <span>{inquiry.guest_count || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Barangay:</span>
                <span>{inquiry.barangay || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Street Name:</span>
                <span>{inquiry.street || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Landmark:</span>
                <span>{inquiry.landmark || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">ZIP Code:</span>
                <span>{inquiry.zip_code || "-"}</span>
              </div>
            </div>

            <div className="quote-subtitle">Venue Contact Person</div>
            <div className="quote-info-grid">
              <div className="info-line">
                <span className="info-label">Name:</span>
                <span>{inquiry.venue_contact_name || "-"}</span>
              </div>
              <div className="info-line">
                <span className="info-label">Contact Number:</span>
                <span>{inquiry.venue_contact_phone || "-"}</span>
              </div>
            </div>
          </div>

          <div className="quote-section">
            <h3>Menu Option</h3>
            {menuPricing.length === 0 && <p>No menu items available.</p>}
            {menuPricing.length > 0 && (
              <div className="quote-row quote-row-head">
                <div>Menu</div>
                <div>Input Note</div>
                <div>Input Price</div>
              </div>
            )}
            {menuPricing.map((item, index) => (
              <div className="quote-row" key={item.name || index}>
                <div className="quote-menu">
                  {item.image_url ? <img src={item.image_url} alt={item.name} /> : <div className="thumb" />}
                  <span>{item.name}</span>
                </div>
                <input
                  className="quote-input"
                  placeholder="Input Note"
                  value={item.note}
                  onChange={(e) => {
                    const next = [...menuPricing];
                    next[index] = { ...next[index], note: e.target.value };
                    setMenuPricing(next);
                  }}
                />
                <input
                  className="quote-input"
                  placeholder="Input Price"
                  value={item.price}
                  onChange={(e) => {
                    const next = [...menuPricing];
                    next[index] = { ...next[index], price: e.target.value };
                    setMenuPricing(next);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="quote-section">
            <h3>Additional Services</h3>
            {servicePricing.length === 0 && <p>No inventory items available.</p>}
            {servicePricing.length > 0 && (
              <div className="quote-row quote-row-head">
                <div>Service</div>
                <div>Quantity</div>
                <div>Input Price</div>
              </div>
            )}
            {servicePricing.map((item, index) => (
              <div className="quote-row" key={item.name || index}>
                <div className="quote-menu">
                  <span>{item.name}</span>
                </div>
                <div className="quote-quantity">
                  <button type="button" onClick={() => handleQuantityChange(index, -1)}>-</button>
                  <input
                    value={item.quantity}
                    placeholder="0"
                    onChange={(e) => {
                      const next = [...servicePricing];
                      next[index] = { ...next[index], quantity: e.target.value };
                      setServicePricing(next);
                    }}
                  />
                  <button type="button" onClick={() => handleQuantityChange(index, 1)}>+</button>
                </div>
                <input
                  className="quote-input"
                  placeholder="Input Price"
                  value={item.price}
                  onChange={(e) => {
                    const next = [...servicePricing];
                    next[index] = { ...next[index], price: e.target.value };
                    setServicePricing(next);
                  }}
                />
              </div>
            ))}
          </div>

          <div className="quote-section">
            <h3>Special Request or Notes</h3>
            <p>{inquiry.special_requests || "N/A"}</p>
          </div>

          <div className="quote-section">
            <h3>Pricing & Computation</h3>
            <div className="quote-payment">
              <span>Payment Method:</span>
              <label className={`payment-pill ${paymentMethod === "gcash" ? "active" : ""}`}>
                <input
                  type="checkbox"
                  checked={paymentMethod === "gcash"}
                  onChange={() => setPaymentMethod("gcash")}
                />
                GCash
              </label>
              <label className={`payment-pill ${paymentMethod === "cash" ? "active" : ""}`}>
                <input
                  type="checkbox"
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
                />
                Cash
              </label>
            </div>
            <div className="quote-summary">
              <div className="summary-title">Quotation Summary</div>
              <div className="summary-block">
                <div className="summary-head">Selected Package</div>
                <div className="summary-line">
                  <span>{packageLabel}</span>
                  <span>PHP {basePackageAmount.toLocaleString()}</span>
                </div>
                {menuSummary.map((item, index) => (
                  <div className="summary-line small" key={`${item.label}-${index}`}>
                    <span>{item.label}{item.note ? ` - ${item.note}` : ""}</span>
                    <span>PHP {item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="summary-block">
                <div className="summary-head">Setup</div>
                {serviceSummary.length === 0 && <div className="summary-line small">No add-ons selected</div>}
                {serviceSummary.map((item, index) => (
                  <div className="summary-line small" key={`${item.label}-${index}`}>
                    <span>{item.label} x {item.quantity || 0}</span>
                    <span>PHP {item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="summary-total">
                <div>
                  <strong>Grand Total:</strong>
                </div>
                <div>PHP {amountValue.toLocaleString()}</div>
              </div>
              <div className="summary-deposit">Deposit (20% of Total): PHP {depositAmount.toLocaleString()}</div>
            </div>
            <div className="quote-input-row">
              <label>Quote Amount</label>
              <input value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
            </div>
            <div className="quote-input-row">
              <label>Quote Notes</label>
              <textarea value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} />
            </div>
          </div>

          <div className="quote-actions">
            <button className="btn-outline" type="button" onClick={() => navigate(-1)}>Cancel</button>
            <button className="btn-outline" type="button" onClick={saveQuote}>Save Quote</button>
            <button className="btn" type="button" onClick={submitBooking}>Submit</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
