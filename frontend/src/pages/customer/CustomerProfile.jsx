import { useEffect, useState } from "react";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";

export default function CustomerProfile() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    alt_phone: ""
  });
  const [security, setSecurity] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    CustomerAPI.getProfile().then((res) => {
      setForm((prev) => ({ ...prev, ...res.data }));
    });
  }, []);

  const save = async () => {
    await CustomerAPI.updateProfile({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      address: form.address
    });
  };

  return (
    <CustomerDashboardLayout
      title="Profile Settings"
      subtitle="Manage your account information and preferences"
    >
      <div className="profile-section">
        <h3>Personal Settings</h3>
        <div className="customer-form-grid">
          <input placeholder="Full Name" value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input placeholder="Email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Alternative Phone Number" value={form.alt_phone || ""} onChange={(e) => setForm({ ...form, alt_phone: e.target.value })} />
          <textarea placeholder="Address" value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <button className="btn" type="button" onClick={save}>Save Changes</button>
        </div>
      </div>

      <div className="profile-section">
        <h3>Security</h3>
        <div className="customer-form-grid">
          <input
            placeholder="Current Password"
            type="password"
            value={security.current}
            onChange={(e) => setSecurity({ ...security, current: e.target.value })}
          />
          <input
            placeholder="New Password"
            type="password"
            value={security.next}
            onChange={(e) => setSecurity({ ...security, next: e.target.value })}
          />
          <input
            placeholder="Confirm New Password"
            type="password"
            value={security.confirm}
            onChange={(e) => setSecurity({ ...security, confirm: e.target.value })}
          />
          <button className="btn" type="button">Save Changes</button>
        </div>
      </div>

      <div className="profile-section">
        <h3>Payment Methods</h3>
        <div className="payment-method-card">
          <strong>VISA •••• 4242</strong>
          <div><small>Expires 12/25</small></div>
        </div>
        <div className="action-link" style={{ marginTop: "10px" }}>+ Add Payment Method</div>
      </div>
    </CustomerDashboardLayout>
  );
}
