export default function AdminManagersForm({ form, setForm, tab, onCancel, onSubmit }) {
  const submitLabel = form._id
    ? "Save Changes"
    : tab === "managers"
      ? "Create Manager"
      : "Create Staff";

  return (
    <div className="admin-modal">
      <div className="form-section">
        <h4>Personal Information</h4>
        <input placeholder="Full Name" value={form.full_name || ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <div className="form-grid-2">
          <input placeholder="Email Address" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Phone Number" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
      </div>
      <div className="form-section">
        <h4>Login Credentials</h4>
        <div className="form-grid-2">
          <input placeholder="Username" value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input placeholder="Password" type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
      </div>
      <div className="form-note">
        The {tab === "managers" ? "manager" : "staff"} will receive login credentials via email.
      </div>
      <div className="actions">
        <button className="btn-outline" type="button" onClick={onCancel}>Cancel</button>
        <button className="btn" onClick={onSubmit}>{submitLabel}</button>
      </div>
    </div>
  );
}
