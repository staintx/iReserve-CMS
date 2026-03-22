export default function AdminInventoryForm({ form, setForm, onCancel, onSubmit, submitLabel = "Add Item" }) {
  const categories = ["Event Setup & Furniture", "Dining & Services Inventory", "Adds On"];
  const isAvailable = form.available !== false;

  return (
    <div className="admin-modal menu-modal">
      <p className="modal-subtitle">Enter details for new equipment or supplies.</p>

      <div className="form-section">
        <div className="form-field">
          <label className="form-label">Item Name</label>
          <input
            placeholder="e.g., Baso"
            value={form.item_name || ""}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Quantity Stock</label>
          <input
            placeholder="e.g., 150"
            value={form.quantity ?? ""}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Category</label>
          <select
            value={form.category || ""}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="" disabled>Select Category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="status-row">
          <div className="status-meta">
            <span className="status-title">Status</span>
            <span className="status-hint">Toggle item availability</span>
          </div>
          <div className="status-controls">
            <span className={`status-value ${isAvailable ? "is-on" : "is-off"}`}>{isAvailable ? "Available" : "Unavailable"}</span>
            <label className="switch" aria-label="Toggle availability">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
              />
              <span className="slider" />
            </label>
          </div>
        </div>
      </div>

      <div className="modal-actions-right">
        <button className="btn-outline" type="button" onClick={onCancel}>Cancel</button>
        <button className="btn" type="button" onClick={onSubmit}>{submitLabel}</button>
      </div>
    </div>
  );
}
