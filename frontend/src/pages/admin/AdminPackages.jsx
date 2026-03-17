import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";

export default function AdminPackages() {
  const [packages, setPackages] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const load = () =>
    AdminAPI.getPackages()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setPackages(data);
        setError("");
      })
      .catch((err) => {
        setPackages([]);
        setError(err.response?.data?.message || "Failed to load packages.");
      });
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      data.append(k, v);
    });
    if (file) data.append("image", file);

    if (form._id) await AdminAPI.updatePackage(form._id, data);
    else await AdminAPI.createPackage(data);

    setShow(false);
    setForm({});
    setFile(null);
    load();
  };

  const edit = (p) => {
    setForm({
      ...p,
      inclusions: Array.isArray(p.inclusions) ? p.inclusions.join(", ") : p.inclusions || "",
      add_ons: Array.isArray(p.add_ons) ? p.add_ons.join(", ") : p.add_ons || ""
    });
    setShow(true);
  };
  const remove = (id) => AdminAPI.deletePackage(id).then(load);
  const toggleAvailability = (pkg) =>
    AdminAPI.updatePackage(pkg._id, { available: !pkg.available }).then(load);

  const mockPackages = [
    { _id: "mock-1", name: "Birthday Package 2", size: "20x40", price_min: 15000, price_max: 30000 },
    { _id: "mock-2", name: "Wedding Package 2", size: "50x80", price_min: 45000, price_max: 90000 },
    { _id: "mock-3", name: "Corporate Package", size: "30x60", price_min: 25000, price_max: 50000 }
  ];

  const list = packages.length > 0 ? packages : mockPackages;

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Packages</h1>
          <p>Create and manage event packages</p>
        </div>
        <div className="admin-actions">
          <button className="btn" onClick={() => setShow(true)}>+ Add New Package</button>
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}
      <div className="admin-card-grid">
        {list.map((p) => (
          <div className="package-tile" key={p._id}>
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} />
            ) : (
              <div className="package-thumb" />
            )}
            <div className="package-meta">
              <h4>{p.name}</h4>
              <p>Size: {p.size || "-"}</p>
              <p>PHP {p.price_min || 0} - {p.price_max || 0}</p>
            </div>
            {p._id?.startsWith("mock-") ? null : (
              <div className="tile-actions">
                <button className="edit" type="button" onClick={() => edit(p)}>Edit</button>
                <button className="edit" type="button" onClick={() => toggleAvailability(p)}>
                  {p.available === false ? "Enable" : "Disable"}
                </button>
                <button className="delete" type="button" onClick={() => remove(p._id)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {show && (
        <Modal title="Add New Package" onClose={() => setShow(false)}>
          <div className="admin-modal">
            <div className="form-section">
              <h4>Basic Information</h4>
              <div className="form-grid-2">
                <input placeholder="Package Name" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input placeholder="Package Size" value={form.size || ""} onChange={(e) => setForm({ ...form, size: e.target.value })} />
              </div>
              <textarea placeholder="Short Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="form-section">
              <div className="form-grid-2">
                <input placeholder="Price Min" value={form.price_min || ""} onChange={(e) => setForm({ ...form, price_min: e.target.value })} />
                <input placeholder="Price Max" value={form.price_max || ""} onChange={(e) => setForm({ ...form, price_max: e.target.value })} />
              </div>
              <div className="toggle-row">
                <span>Current Status</span>
                <select value={form.available === false ? "no" : "yes"} onChange={(e) => setForm({ ...form, available: e.target.value === "yes" })}>
                  <option value="yes">Available</option>
                  <option value="no">Unavailable</option>
                </select>
              </div>
            </div>

            <div className="form-section">
              <h4>Detailed Information</h4>
              <textarea placeholder="About This Package" value={form.booking_requirements || ""} onChange={(e) => setForm({ ...form, booking_requirements: e.target.value })} />
              <textarea placeholder="Cancellation Policy" value={form.cancellation_policy || ""} onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })} />
            </div>

            <div className="form-section">
              <h4>Services, Inclusions & Add-ons</h4>
              <textarea placeholder="Services & Inclusions (comma separated)" value={form.inclusions || ""} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} />
              <textarea placeholder="Add-ons (comma separated)" value={form.add_ons || ""} onChange={(e) => setForm({ ...form, add_ons: e.target.value })} />
            </div>

            <div className="form-section">
              <h4>Media Upload</h4>
              <label className="upload-box">
                Drag & drop or click to upload cover image
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
              </label>
            </div>

            <div className="actions">
              <button className="btn-outline" type="button" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn" onClick={submit}>Add Package</button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}