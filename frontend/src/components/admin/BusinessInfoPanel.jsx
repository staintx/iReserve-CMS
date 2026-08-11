import { useCallback, useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";

const DEFAULT_INFO = {
  business_name: "",
  contact_number: "",
  email: "",
  address: "",
  pickup_address: "",
  hours: "",
  facebook: "",
  instagram: "",
  terms_url: "",
  privacy_url: "",
  deposit_percentage: 20,
  custom_event_setup_price: 15000,
  custom_food_and_event_price: 800,
  max_bookings_per_day: 2
};

const footerItems = [
  { label: "Brand name", key: "business_name" },
  { label: "Phone", key: "contact_number" },
  { label: "Email", key: "email" },
  { label: "Address", key: "address" },
  { label: "Hours", key: "hours" },
  { label: "Facebook", key: "facebook" },
  { label: "Instagram", key: "instagram" },
  { label: "Terms", key: "terms_url" },
  { label: "Privacy", key: "privacy_url" },
  { label: "Deposit", key: "deposit_percentage" }
];

export default function BusinessInfoPanel() {
  const [form, setForm] = useState(DEFAULT_INFO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { notify } = useToast();
  const previewInfo = { ...DEFAULT_INFO, ...form };

  const loadData = useCallback(() => {
    AdminAPI.getBusinessInfo()
      .then((res) => {
        setForm((prev) => ({ ...prev, ...(res.data || {}) }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealTimeRefresh(loadData);

  const updateField = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await AdminAPI.updateBusinessInfo(form);
      notify("Business info updated.", "success");
    } catch (err) {
      notify(err.response?.data?.message || "We could not save the business info. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="business-info-loading panel">Loading business info...</div>;

  return (
    <div className="business-info-shell">
      <div className="business-info-hero panel">
        <div>
          <p className="business-info-kicker">Footer content editor</p>
          <h2>Business Information</h2>
          <p className="business-info-intro">
            Update the contact details, policies, and social links that appear in the public landing page footer.
          </p>
        </div>
        <div className="business-info-chip-row">
          {footerItems.map((item) => (
            <span key={item.key} className="business-info-chip">{item.label}</span>
          ))}
        </div>
      </div>

      <div className="business-info-grid">
        <form className="business-info-form panel" onSubmit={save}>
          <div className="form-section">
            <h4>Core details</h4>
            <div className="form-grid-2">
              <label className="business-info-field">
                <span>Business name</span>
                <input className="business-info-input" value={form.business_name} onChange={updateField("business_name")} placeholder="Business name" />
              </label>
              <label className="business-info-field">
                <span>Contact number</span>
                <input className="business-info-input" type="tel" value={form.contact_number} onChange={updateField("contact_number")} placeholder="Contact number" />
              </label>
            </div>
            <div className="form-grid-2">
              <label className="business-info-field">
                <span>Email address</span>
                <input className="business-info-input" type="email" value={form.email} onChange={updateField("email")} placeholder="Email address" />
              </label>
              <label className="business-info-field">
                <span>Business hours</span>
                <input className="business-info-input" value={form.hours} onChange={updateField("hours")} placeholder="Business hours" />
              </label>
            </div>
            <label className="business-info-field">
              <span>Business address</span>
              <textarea className="business-info-input business-info-textarea" rows="4" value={form.address} onChange={updateField("address")} placeholder="Business address" />
            </label>
          </div>

          <div className="form-section">
            <h4>Booking Configuration</h4>
            <label className="business-info-field">
              <span>Pickup location address</span>
              <textarea className="business-info-input business-info-textarea" rows="3" value={form.pickup_address} onChange={updateField("pickup_address")} placeholder="Address where customers collect pickup orders" />
              <small>Shown to customers who choose pickup. Leave blank to use the business address above.</small>
            </label>
            <div className="form-grid-2">
              <label className="business-info-field">
                <span>Deposit Percentage (%)</span>
                <input className="business-info-input" type="number" min="0" max="100" value={form.deposit_percentage} onChange={updateField("deposit_percentage")} placeholder="20" />
              </label>
              <label className="business-info-field">
                <span>Max Bookings per Day</span>
                <input className="business-info-input" type="number" min="1" value={form.max_bookings_per_day} onChange={updateField("max_bookings_per_day")} placeholder="2" />
              </label>
            </div>

          </div>

          <div className="form-section">
            <h4>Social links</h4>
            <div className="form-grid-2">
              <label className="business-info-field">
                <span>Facebook link</span>
                <input className="business-info-input" value={form.facebook} onChange={updateField("facebook")} placeholder="https://facebook.com/..." />
              </label>
              <label className="business-info-field">
                <span>Instagram link</span>
                <input className="business-info-input" value={form.instagram} onChange={updateField("instagram")} placeholder="https://instagram.com/..." />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h4>Policies</h4>
            <div className="form-grid-2">
              <label className="business-info-field">
                <span>Terms and Conditions URL</span>
                <input className="business-info-input" value={form.terms_url} onChange={updateField("terms_url")} placeholder="https://..." />
              </label>
              <label className="business-info-field">
                <span>Privacy Policy URL</span>
                <input className="business-info-input" value={form.privacy_url} onChange={updateField("privacy_url")} placeholder="https://..." />
              </label>
            </div>
          </div>

          <div className="business-info-actions">
            <p className="business-info-note">These values are shown on the public landing page footer after you save them.</p>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>

        <aside className="business-info-preview panel">
          <div className="business-info-preview-header">
            <p className="business-info-kicker">Footer preview</p>
            <h3>{previewInfo.business_name || "Business name preview"}</h3>
            <p>What visitors will see in the landing page footer.</p>
          </div>

          <div className="business-info-preview-card">
            <div>
              <span className="business-info-preview-label">Contact</span>
              <strong>{previewInfo.contact_number || "Add a contact number"}</strong>
            </div>
            <div>
              <span className="business-info-preview-label">Email</span>
              <strong>{previewInfo.email || "Add an email address"}</strong>
            </div>
            <div>
              <span className="business-info-preview-label">Address</span>
              <strong>{previewInfo.address || "Add a business address"}</strong>
            </div>
            <div>
              <span className="business-info-preview-label">Hours</span>
              <strong>{previewInfo.hours || "Add business hours"}</strong>
            </div>
            <div>
              <span className="business-info-preview-label">Deposit Required</span>
              <strong>{previewInfo.deposit_percentage}% of total</strong>
            </div>
          </div>

          <div className="business-info-preview-links">
            <div>
              <span>Facebook</span>
              <strong>{previewInfo.facebook || "Not set"}</strong>
            </div>
            <div>
              <span>Instagram</span>
              <strong>{previewInfo.instagram || "Not set"}</strong>
            </div>
            <div>
              <span>Policies</span>
              <strong>{previewInfo.terms_url || previewInfo.privacy_url ? "Configured" : "Not set"}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
