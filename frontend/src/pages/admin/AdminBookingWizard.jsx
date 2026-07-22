import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";

const steps = [
  "Package Type",
  "Service Type",
  "Select Package",
  "Event & Venue",
  "Services",
  "Review & Payment"
];

export default function AdminBookingWizard() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [step, setStep] = useState(0);
  const [packages, setPackages] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customer_id: "",
    package_id: "",
    package_type: "existing",
    service_type: "food_event",
    include_food: true,
    event_type: "",
    event_theme: "",
    event_date: "",
    start_time: "",
    duration_hours: "",
    guest_count: "",
    venue_type: "",
    indoor_outdoor: "",
    province: "",
    municipality: "",
    barangay: "",
    street: "",
    landmark: "",
    zip_code: "",
    venue_contact_name: "",
    venue_contact_phone: "",
    selected_menu: [],
    additional_services: [],
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    contact_alt_phone: "",
    contact_method: "email",
    payment_method: "cash",
    total_price: "",
    manager_id: ""
  });

  useEffect(() => {
    AdminAPI.getPackages().then((res) => setPackages(Array.isArray(res.data) ? res.data : [])).catch(() => setPackages([]));
    AdminAPI.getMenu().then((res) => setMenuItems(Array.isArray(res.data) ? res.data : [])).catch(() => setMenuItems([]));
    AdminAPI.getInventory().then((res) => setInventoryItems(Array.isArray(res.data) ? res.data : [])).catch(() => setInventoryItems([]));
    AdminAPI.getStaff().then((res) => setStaff(Array.isArray(res.data) ? res.data : [])).catch(() => setStaff([]));
    AdminAPI.getCustomers().then((res) => setCustomers(Array.isArray(res.data) ? res.data : [])).catch(() => setCustomers([]));
  }, []);
  const managers = staff;
  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const toggleValue = (key, value) => {
    setForm((prev) => {
      const list = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = list.includes(value);
      return { ...prev, [key]: exists ? list.filter((item) => item !== value) : [...list, value] };
    });
  };

  const setServiceType = (type) => {
    const includeFood = type !== "event_only";
    setForm((prev) => ({
      ...prev,
      service_type: type,
      include_food: includeFood
    }));
  };

  const submit = async () => {
    if (!form.customer_id) {
      notify("Please select a customer.", "error");
      return;
    }
    if (!form.event_type || !form.event_date || !form.guest_count) {
      notify("Please complete the required event details.", "error");
      return;
    }
    const total = Number(form.total_price || 0);
    if (!Number.isFinite(total) || total <= 0) {
      notify("Please provide a valid total price.", "error");
      return;
    }

    const payload = {
      ...form,
      total_price: total,
      package_id: form.package_type === "existing" ? form.package_id : undefined,
      include_food: form.include_food,
      selected_menu: form.include_food ? form.selected_menu : [],
      additional_services: form.additional_services
    };

    try {
      await AdminAPI.createBooking(payload);
      notify("Booking created.", "success");
      navigate("/admin/bookings/active");
    } catch (err) {
      notify(err.response?.data?.message || "We could not create the booking. Please try again.", "error");
    }
  };

  const summaryPackage = useMemo(() => packages.find((p) => p._id === form.package_id), [packages, form.package_id]);

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Add New Booking</h1>
          <p>Configure booking details and confirm payment</p>
        </div>
      </div>

      <div className="panel">
        <div className="tab-row" style={{ marginBottom: 16 }}>
          {steps.map((label, index) => (
            <button key={label} type="button" className={index === step ? "active" : ""}>
              {label}
            </button>
          ))}
        </div>

        {step === 0 && (
          <div className="admin-modal">
            <h3>Package Type Selection</h3>
            <p>Choose how you want to configure the service.</p>
            <div className="card-grid">
              <button
                className={`select-card ${form.package_type === "existing" ? "active" : ""}`}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, package_type: "existing" }))}
              >
                <strong>Existing Package</strong>
                <span>Select from predefined packages.</span>
              </button>
              <button
                className={`select-card ${form.package_type === "custom" ? "active" : ""}`}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, package_type: "custom", package_id: "" }))}
              >
                <strong>Customize Package</strong>
                <span>Manually configure services and equipment.</span>
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="admin-modal">
            <h3>Service Type Selection</h3>
            <p>Will this booking include food?</p>
            <div className="card-grid">
              <button className={`select-card ${form.service_type === "food_only" ? "active" : ""}`} type="button" onClick={() => setServiceType("food_only")}>
                <strong>Food Only</strong>
                <span>Menu & catering services</span>
              </button>
              <button className={`select-card ${form.service_type === "event_only" ? "active" : ""}`} type="button" onClick={() => setServiceType("event_only")}>
                <strong>Event Setup Only</strong>
                <span>Planning, setup & decor</span>
              </button>
              <button className={`select-card ${form.service_type === "food_event" ? "active" : ""}`} type="button" onClick={() => setServiceType("food_event")}>
                <strong>Food & Event Setup</strong>
                <span>Complete catering & event services</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="admin-modal">
            <h3>Select Package</h3>
            {form.package_type === "custom" && <p>Custom packages are configured in the next steps.</p>}
            {form.package_type === "existing" && (
              <div className="admin-card-grid package-grid">
                {packages.map((pkg) => (
                  <button
                    key={pkg._id}
                    type="button"
                    className={`package-card ${form.package_id === pkg._id ? "active" : ""}`}
                    onClick={() => setForm((prev) => ({ ...prev, package_id: pkg._id }))}
                  >
                    <div className="package-card-media">
                      {pkg.image_url ? <img src={pkg.image_url} alt={pkg.name} /> : <div className="package-thumb" />}
                    </div>
                    <div className="package-card-body">
                      <h3 className="package-card-title">{pkg.name}</h3>
                      <p className="package-card-desc">{pkg.size || "Package"}</p>
                    </div>
                  </button>
                ))}
                {packages.length === 0 && <p className="dash-empty">No packages yet.</p>}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="admin-modal">
            <h3>Event & Venue Information</h3>
            <div className="form-section">
              <div className="form-grid-2">
                <input placeholder="Event Type" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
                <input placeholder="Event Theme or Colors" value={form.event_theme} onChange={(e) => setForm({ ...form, event_theme: e.target.value })} />
              </div>
              <div className="form-grid-2">
                <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                <input placeholder="Event Start Time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="form-grid-2">
                <input placeholder="Estimated Guest Count" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} />
                <input placeholder="Event Duration (hours)" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
              </div>
            </div>

            <div className="form-section">
              <h4>Venue Information</h4>
              <div className="form-grid-2">
                <input placeholder="Venue Type" value={form.venue_type} onChange={(e) => setForm({ ...form, venue_type: e.target.value })} />
                <input placeholder="Indoor or Outdoor" value={form.indoor_outdoor} onChange={(e) => setForm({ ...form, indoor_outdoor: e.target.value })} />
              </div>
              <div className="form-grid-2">
                <input placeholder="Province" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
                <input placeholder="Municipality" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
              </div>
              <div className="form-grid-2">
                <input placeholder="Barangay" value={form.barangay} onChange={(e) => setForm({ ...form, barangay: e.target.value })} />
                <input placeholder="Street Name" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
              </div>
              <div className="form-grid-2">
                <input placeholder="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
                <input placeholder="ZIP Code" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
              </div>
            </div>

            <div className="form-section">
              <h4>Venue Contact</h4>
              <div className="form-grid-2">
                <input placeholder="Contact Name" value={form.venue_contact_name} onChange={(e) => setForm({ ...form, venue_contact_name: e.target.value })} />
                <input placeholder="Contact Number" value={form.venue_contact_phone} onChange={(e) => setForm({ ...form, venue_contact_phone: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="admin-modal">
            <h3>Additional Services</h3>
            {form.include_food && (
              <div className="form-section">
                <h4>Menu Items</h4>
                <div className="check-grid">
                  {menuItems.map((item) => (
                    <label key={item._id} className="check-item">
                      <input
                        type="checkbox"
                        checked={form.selected_menu.includes(item.name)}
                        onChange={() => toggleValue("selected_menu", item.name)}
                      />
                      <span>{item.name}</span>
                    </label>
                  ))}
                  {menuItems.length === 0 && <p className="dash-empty">No menu items.</p>}
                </div>
              </div>
            )}

            <div className="form-section">
              <h4>Services & Equipment</h4>
              <div className="check-grid">
                {inventoryItems.map((item) => (
                  <label key={item._id} className="check-item">
                    <input
                      type="checkbox"
                      checked={form.additional_services.includes(item.item_name)}
                      onChange={() => toggleValue("additional_services", item.item_name)}
                    />
                    <span>{item.item_name}</span>
                  </label>
                ))}
                {inventoryItems.length === 0 && <p className="dash-empty">No inventory items.</p>}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="admin-modal">
            <h3>Review & Payment</h3>
            <div className="form-section">
              <h4>Contact Information</h4>
              <div className="form-grid-2">
                <select value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.full_name || customer.email}
                    </option>
                  ))}
                </select>
                <select value={form.manager_id} onChange={(e) => setForm({ ...form, manager_id: e.target.value })}>
                  <option value="">Assign Manager</option>
                  {managers.map((manager) => (
                    <option key={manager._id} value={manager._id}>
                      {manager.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-grid-2">
                <input placeholder="First Name" value={form.contact_first_name} onChange={(e) => setForm({ ...form, contact_first_name: e.target.value })} />
                <input placeholder="Last Name" value={form.contact_last_name} onChange={(e) => setForm({ ...form, contact_last_name: e.target.value })} />
              </div>
              <div className="form-grid-2">
                <input placeholder="Email Address" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                <input placeholder="Phone Number" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
            </div>

            <div className="form-section">
              <h4>Payment Method</h4>
              <div className="form-grid-2">
                <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="paymongo">PayMongo</option>
                </select>
                <input placeholder="Total Price" value={form.total_price} onChange={(e) => setForm({ ...form, total_price: e.target.value })} />
              </div>
            </div>

            <div className="form-section">
              <h4>Summary</h4>
              <p><strong>Package:</strong> {form.package_type === "existing" ? (summaryPackage?.name || "Select a package") : "Custom Package"}</p>
              <p><strong>Menu Items:</strong> {form.selected_menu.length ? form.selected_menu.join(", ") : "None"}</p>
              <p><strong>Services:</strong> {form.additional_services.length ? form.additional_services.join(", ") : "None"}</p>
            </div>
          </div>
        )}

        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn-outline" type="button" onClick={() => navigate(-1)}>Cancel</button>
          {step > 0 && <button className="btn-outline" type="button" onClick={back}>Back</button>}
          {step < steps.length - 1 && <button className="btn" type="button" onClick={next}>Next Step</button>}
          {step === steps.length - 1 && <button className="btn" type="button" onClick={submit}>Submit</button>}
        </div>
      </div>
    </AdminLayout>
  );
}
