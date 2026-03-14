export default function AdminInventoryForm({ form, setForm, onCancel, onSubmit, submitLabel = "Add Item" }) {
  return (
    <div className="admin-modal">
      <div className="form-section">
        <input placeholder="Item Name" value={form.item_name || ""} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
        <input placeholder="Quantity Stock" value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <input placeholder="Category" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <div className="toggle-row">
          <span>Status</span>
          <select value={form.available === false ? "no" : "yes"} onChange={(e) => setForm({ ...form, available: e.target.value === "yes" })}>
            <option value="yes">Available</option>
            <option value="no">Unavailable</option>
          </select>
        </div>
      </div>
      <div className="actions">
        <button className="btn-outline" type="button" onClick={onCancel}>Cancel</button>
        <button className="btn" onClick={onSubmit}>{submitLabel}</button>
      </div>
    </div>
  );
}
