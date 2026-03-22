export default function AdminMenuForm({ form, setForm, file, setFile, onCancel, onSubmit, submitLabel = "Add Item" }) {
  const categories = ["Main Dishes", "Pasta", "Rice", "Desserts", "Drinks"];
  const isAvailable = form.available !== false;

  return (
    <div className="admin-modal menu-modal">
      <p className="modal-subtitle">Create a new food menu item with details and image</p>

      <div className="form-section">
        <h4>Item Details</h4>
        <div className="form-field">
          <label className="form-label">Item Name</label>
          <input
            placeholder="e.g., Herb Roasted Chicken"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Description</label>
          <textarea
            placeholder="Provide a brief description (e.g., Tender chicken with rosemary...)"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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

      <div className="form-section">
        <h4>Food Upload</h4>
        <label className="menu-upload" role="button" tabIndex={0}>
          <input
            className="menu-upload-input"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div className="menu-upload-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <div className="menu-upload-title">Upload an Image</div>
          <div className="menu-upload-hint">PNG, JPG up to 10MB</div>
          {file?.name ? <div className="menu-upload-file">Selected: {file.name}</div> : null}
        </label>
      </div>

      <div className="actions">
        <button className="btn-outline" type="button" onClick={onCancel}>Cancel</button>
        <button className="btn" onClick={onSubmit}>{submitLabel}</button>
      </div>
    </div>
  );
}
