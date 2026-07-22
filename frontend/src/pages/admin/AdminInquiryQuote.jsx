import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import useToast from "../../hooks/useToast";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Modal from "../../components/common/Modal";

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
  const [staff, setStaff] = useState([]);
  const [menuPricing, setMenuPricing] = useState([]);
  const [servicePricing, setServicePricing] = useState([]);
  const [quoteNotes, setQuoteNotes] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [packageAmount, setPackageAmount] = useState("");
  const [managerId, setManagerId] = useState("");
  const [additionalCharges, setAdditionalCharges] = useState([]);
  const [confirmSend, setConfirmSend] = useState(false);
  const [showDateChangeRequest, setShowDateChangeRequest] = useState(false);
  const [dateChangeNote, setDateChangeNote] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    Promise.all([
      AdminAPI.getInquiry(id),
      AdminAPI.getPackages(),
      AdminAPI.getMenu(),
      AdminAPI.getInventory(),
      AdminAPI.getStaff()
    ])
      .then(([inquiryRes, packageRes, menuRes, inventoryRes, staffRes]) => {
        const inquiryData = inquiryRes.data;
        setInquiry(inquiryData);
        setPackages(Array.isArray(packageRes.data) ? packageRes.data : []);
        setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
        setInventoryItems(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);
        setStaff(Array.isArray(staffRes.data) ? staffRes.data : []);
        setQuoteNotes(inquiryData.quote_notes || "");
        setQuoteAmount(inquiryData.quote_amount || "");
        setEventDate(inquiryData.event_date ? new Date(inquiryData.event_date).toISOString().split("T")[0] : "");
        setPaymentMethod(inquiryData.payment_method || "gcash");
        setPackageAmount(inquiryData.package_amount ?? "");
        setManagerId(inquiryData.manager_id?._id || inquiryData.manager_id || "");
        setAdditionalCharges(Array.isArray(inquiryData.additional_charges) ? inquiryData.additional_charges : []);
        setIsEditing(["new", "under review", "negotiating"].includes(inquiryData.status));
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
  const additionalTotal = useMemo(
    () => additionalCharges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [additionalCharges]
  );
  const computedTotal = menuTotal + serviceTotal + additionalTotal;
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
  const managers = useMemo(() => staff, [staff]);
  const handleEdit = () => {
    AdminAPI.updateInquiry(inquiry._id, { status: "negotiating" })
      .then(() => {
        setInquiry((prev) => ({ ...prev, status: "negotiating" }));
        setIsEditing(true);
        notify("Inquiry is now in negotiation state.", "success");
      })
      .catch((err) => notify(err.response?.data?.message || "Could not change state to negotiating.", "error"));
  };

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
      event_date: eventDate || undefined,
      package_amount: basePackageAmount || undefined,
      payment_method: paymentMethod,
      status: "awaiting confirmation",
      menu_items: menuPayload,
      service_items: servicePayload,
      additional_charges: additionalCharges.filter(c => c.name).map(c => ({ name: c.name, amount: c.amount })),
      selected_menu: menuPayload.map((item) => item.name),
      additional_services: servicePayload.map((item) => item.name)
    };
  };

  const saveQuote = () => {
    if (!inquiry) return;
    AdminAPI.updateInquiry(inquiry._id, buildPayload())
      .then(() => {
        notify("Quotation sent to customer for approval.", "success");
        setConfirmSend(false);
        navigate("/admin/inquiries");
      })
      .catch((err) => notify(err.response?.data?.message || "We could not send the quote. Please try again.", "error"));
  };

  const requestDateChange = () => {
    if (!inquiry) return;

    const message = dateChangeNote.trim() || "The selected event date conflicts with an existing booking. Please choose a new date and reply with your preferred schedule.";

    AdminAPI.updateInquiry(inquiry._id, {
      ...buildPayload(),
      status: "negotiating",
      date_change_request: {
        message,
        current_date: eventDate || undefined,
        requested_at: new Date().toISOString()
      }
    })
      .then(() => {
        notify("Date change request sent to the customer.", "success");
        setShowDateChangeRequest(false);
        setDateChangeNote("");
      })
      .catch((err) => {
        notify(err.response?.data?.message || "We could not send the date change request.", "error");
      });
  };

  const submitBooking = () => {
    if (!inquiry) return;
    if (!managerId) {
      notify("Please assign a manager before submitting.", "error");
      return;
    }
    const finalAmount = Number(quoteAmount || computedTotalWithPackage || 0);

    AdminAPI.updateInquiry(inquiry._id, { ...buildPayload(), status: "confirmed" })
      .then(() =>
        AdminAPI.createBookingFromInquiry(inquiry._id, {
          total_price: finalAmount,
          event_date: eventDate || undefined,
          package_id: inquiry.package_id || undefined,
          manager_id: managerId
        })
      )
      .then(() => {
        notify("Booking created.", "success");
        navigate("/admin/bookings/active");
      })
      .catch((err) => {
        const message = err?.response?.data?.message || "We could not create the booking. Please try again.";
        if (err?.response?.status === 409) {
          setDateChangeNote(
            `The selected date ${eventDate ? new Date(eventDate + "T00:00:00").toLocaleDateString() : ""} conflicts with another booking. Please request the customer to choose a new date.`
          );
          setShowDateChangeRequest(true);
        }
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

        {inquiry.quote_change_request && !inquiry.quote_change_request.resolved_at && inquiry.status === "negotiating" && (
          <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "#fef3c7", borderLeft: "4px solid #f59e0b", borderRadius: "8px" }}>
            <h3 style={{ marginTop: 0, color: "#d97706", fontSize: "1.1rem" }}>Customer Requested Changes</h3>
            <p style={{ margin: "0.5rem 0 0", color: "#b45309" }}>{inquiry.quote_change_request.message}</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#b45309", opacity: 0.8 }}>Update the quotation and send it back to the customer. This alert will clear automatically.</p>
          </div>
        )}

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
                  disabled={!isEditing}
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
                <input
                  disabled={!isEditing}
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
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
                  <button type="button" disabled={!isEditing} onClick={() => handleQuantityChange(index, -1)}>-</button>
                  <input
                    disabled={!isEditing}
                    value={item.quantity}
                    placeholder="0"
                    onChange={(e) => {
                      const next = [...servicePricing];
                      next[index] = { ...next[index], quantity: e.target.value };
                      setServicePricing(next);
                    }}
                  />
                  <button type="button" disabled={!isEditing} onClick={() => handleQuantityChange(index, 1)}>+</button>
                </div>
                <input
                  disabled={!isEditing}
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
            <h3>Additional Charges</h3>
            {additionalCharges.length > 0 && (
              <div className="quote-row quote-row-head">
                <div>Charge Name</div>
                <div>Amount</div>
                <div>Actions</div>
              </div>
            )}
            {additionalCharges.map((charge, index) => (
              <div className="quote-row" key={index}>
                <input
                  disabled={!isEditing}
                  className="quote-input"
                  placeholder="Charge Name (e.g., Out of Town Fee)"
                  value={charge.name}
                  onChange={(e) => {
                    const next = [...additionalCharges];
                    next[index].name = e.target.value;
                    setAdditionalCharges(next);
                  }}
                />
                <input
                  disabled={!isEditing}
                  className="quote-input"
                  placeholder="Amount"
                  type="number"
                  value={charge.amount}
                  onChange={(e) => {
                    const next = [...additionalCharges];
                    next[index].amount = e.target.value;
                    setAdditionalCharges(next);
                  }}
                />
                {isEditing && (
                  <button
                    className="btn-outline"
                    type="button"
                    onClick={() => {
                      const next = [...additionalCharges];
                      next.splice(index, 1);
                      setAdditionalCharges(next);
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {isEditing && (
              <button
                className="btn-outline"
                type="button"
                style={{ marginTop: "1rem" }}
                onClick={() => setAdditionalCharges([...additionalCharges, { name: "", amount: "" }])}
              >
                + Add Custom Charge
              </button>
            )}
          </div>

          <div className="quote-section">
            <h3>Special Request or Notes</h3>
            <p>{inquiry.special_requests || "N/A"}</p>
          </div>

          <div className="quote-section">
            <h3>Pricing & Computation</h3>
            <div className="quote-payment">
              <span>Payment Method:</span>
              <label className={`payment-pill ${paymentMethod === "gcash" ? "active" : ""} ${!isEditing ? "disabled" : ""}`}>
                <input
                  disabled={!isEditing}
                  type="checkbox"
                  checked={paymentMethod === "gcash"}
                  onChange={() => setPaymentMethod("gcash")}
                />
                GCash
              </label>
              <label className={`payment-pill ${paymentMethod === "cash" ? "active" : ""} ${!isEditing ? "disabled" : ""}`}>
                <input
                  disabled={!isEditing}
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
              {additionalCharges.length > 0 && (
                <div className="summary-block">
                  <div className="summary-head">Additional Charges</div>
                  {additionalCharges.filter(c => c.name).map((item, index) => (
                    <div className="summary-line small" key={`charge-${index}`}>
                      <span>{item.name}</span>
                      <span>PHP {(Number(item.amount) || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
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
              <input disabled={!isEditing} value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} />
            </div>
            <div className="quote-input-row">
              <label>Quote Notes</label>
              <textarea disabled={!isEditing} value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} />
            </div>
            <div className="quote-input-row">
              <label>Assign Manager</label>
              <select disabled={!isEditing && inquiry.status !== "confirmed"} value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                <option value="">Select Manager</option>
                {managers.map((manager) => (
                  <option key={manager._id} value={manager._id}>{manager.full_name}</option>
                ))}
              </select>
              {managers.length === 0 && <small>No manager accounts available.</small>}
            </div>
          </div>

          <div className="quote-actions">
            <button className="btn-outline" type="button" onClick={() => navigate(-1)}>Cancel</button>
            {!isEditing && inquiry.status === "awaiting confirmation" && (
              <button className="btn" type="button" onClick={handleEdit}>Edit</button>
            )}
            {isEditing && (
              <button className="btn-outline" type="button" onClick={() => setConfirmSend(true)}>Send quotation</button>
            )}
            {inquiry.status === "confirmed" && (
              <button className="btn" type="button" onClick={submitBooking}>Submit Booking</button>
            )}
          </div>
        </div>
      </div>
      
      {confirmSend && (
        <ConfirmDialog
          message="Are you sure you want to send this quotation to the customer for approval?"
          onConfirm={saveQuote}
          onCancel={() => setConfirmSend(false)}
        />
      )}

      {showDateChangeRequest && (
        <Modal title="Request a new date" onClose={() => setShowDateChangeRequest(false)} className="modal-wide">
          <div className="quote-section" style={{ border: "none", paddingTop: 0 }}>
            <p style={{ marginTop: 0 }}>
              The selected date conflicts with an existing booking. Send the customer a date-change request so they can update the quotation.
            </p>
            <div className="quote-input-row">
              <label>Request message</label>
              <textarea
                value={dateChangeNote}
                onChange={(e) => setDateChangeNote(e.target.value)}
                rows={5}
                placeholder="Explain why the date needs to change and ask the customer to reply with a new one."
              />
            </div>
            <div className="quote-actions" style={{ justifyContent: "flex-end" }}>
              <button className="btn-outline" type="button" onClick={() => setShowDateChangeRequest(false)}>
                Cancel
              </button>
              <button className="btn" type="button" onClick={requestDateChange}>
                Send Request
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
