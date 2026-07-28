export default function AdminInventoryForm({ form, setForm, onCancel, onSubmit, submitLabel = "Add Item" }) {
  const categories = ["Event Setup & Furniture", "Dining & Services Inventory", "Adds On"];
  const isAvailable = form.available !== false;

  return (
    <div className="admin-modal menu-modal" style={{ padding: "10px" }}>
      <p className="modal-subtitle" style={{ marginBottom: "20px" }}>Enter details for new equipment or supplies.</p>

      <div className="form-section">
        <div className="form-field">
          <label className="form-label" style={{ fontWeight: 600, color: "#2B3B8A", marginBottom: "8px", display: "block" }}>Item Name</label>
          <input
            className="inv-form-input"
            placeholder="e.g., Banquet Chair"
            value={form.item_name || ""}
            onChange={(e) => setForm({ ...form, item_name: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label className="form-label" style={{ fontWeight: 600, color: "#2B3B8A", marginBottom: "8px", display: "block" }}>Quantity Stock</label>
          <input
            className="inv-form-input"
            type="number"
            placeholder="e.g., 150"
            value={form.quantity ?? ""}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label className="form-label" style={{ fontWeight: 600, color: "#2B3B8A", marginBottom: "8px", display: "block" }}>Category</label>
          <select
            className="inv-form-input"
            value={form.category || ""}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="" disabled>Select Category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="status-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div className="status-meta">
            <span className="status-title" style={{ fontWeight: 600, color: "#2B3B8A", display: "block" }}>Item Status</span>
            <span className="status-hint" style={{ fontSize: "12px", color: "#64748b" }}>Toggle to make this item active or inactive</span>
          </div>
          <div className="status-controls" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: isAvailable ? "#10b981" : "#64748b" }}>
              {isAvailable ? "Available" : "Unavailable"}
            </span>
            <label className="inv-switch-v2" aria-label="Toggle availability">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setForm({ ...form, available: e.target.checked })}
              />
              <span className="inv-slider-v2" />
            </label>
          </div>
        </div>
      </div>

      <div className="modal-actions-right" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
        <button className="btn-outline" type="button" onClick={onCancel} style={{ padding: "10px 24px", borderRadius: "12px", fontWeight: 600 }}>Cancel</button>
        <button className="inv-btn-primary" type="button" onClick={onSubmit}>{submitLabel}</button>
      </div>
    </div>
  );
}
