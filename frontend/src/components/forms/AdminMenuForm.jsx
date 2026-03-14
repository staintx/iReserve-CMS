export default function AdminMenuForm({ form, setForm, setFile, onCancel, onSubmit, submitLabel = "Add Item" }) {
  return (
    <div className="admin-modal">
      <div className="form-section">
        <h4>Item Details</h4>
        <input placeholder="Item Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <textarea placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input placeholder="Category" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <div className="toggle-row">
          <span>Status</span>
          <select value={form.available === false ? "no" : "yes"} onChange={(e) => setForm({ ...form, available: e.target.value === "yes" })}>
            <option value="yes">Available</option>
            <option value="no">Unavailable</option>
          </select>
        </div>
      </div>

      <div className="form-section">
        <h4>Food Upload</h4>
        <label className="upload-box">
          Upload an image
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        </label>
      </div>

      <div className="actions">
        <button className="btn-outline" type="button" onClick={onCancel}>Cancel</button>
        <button className="btn" onClick={onSubmit}>{submitLabel}</button>
      </div>
    </div>
  );
}
