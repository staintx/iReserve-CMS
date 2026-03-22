import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import useToast from "../../hooks/useToast";

export default function AdminPackages() {
  const [packages, setPackages] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [inclusionDraft, setInclusionDraft] = useState({ category: "", item: "", qty: "" });
  const [addOnDraft, setAddOnDraft] = useState({ name: "", qty: "" });
  const [error, setError] = useState("");
  const { notify } = useToast();

  const inclusionCategories = ["Event Setup & Furniture", "Dining & Service Inventory"];

  const initialFormState = {
    name: "",
    size: "",
    description: "",
    fullDescription: "",
    price_min: "",
    price_max: "",
    available: true,
    inclusions: [],
    add_ons: []
  };

  const load = () =>
    AdminAPI.getPackages()
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setPackages(data);
        setError("");
      })
      .catch((err) => {
        setPackages([]);
        const message = err.response?.data?.message || "We could not load packages. Please refresh and try again.";
        setError(message);
        notify(message, "error");
      });

  useEffect(() => {
    load();
  }, []);

  const formatQtyLine = (name, qty) => {
    const cleanName = String(name || "").trim();
    if (!cleanName) return "";
    const cleanQty = String(qty || "").trim();
    if (!cleanQty) return cleanName;
    return `${cleanName} x${cleanQty}`;
  };

  const formatInclusionLine = (category, item, qty) => {
    const cleanCategory = String(category || "").trim();
    const cleanItem = String(item || "").trim();
    if (!cleanCategory || !cleanItem) return "";
    const base = `${cleanCategory} - ${cleanItem}`;
    return formatQtyLine(base, qty);
  };

  const addInclusion = () => {
    if (!inclusionDraft.category) return;
    const line = formatInclusionLine(inclusionDraft.category, inclusionDraft.item, inclusionDraft.qty);
    if (!line) return;
    const next = [...(form.inclusions || []), line];
    setForm({ ...form, inclusions: next });
    setInclusionDraft({ category: inclusionDraft.category, item: "", qty: "" });
  };

  const removeInclusion = (index) => {
    const next = (form.inclusions || []).filter((_, i) => i !== index);
    setForm({ ...form, inclusions: next });
  };

  const addAddOn = () => {
    const line = formatQtyLine(addOnDraft.name, addOnDraft.qty);
    if (!line) return;
    const next = [...(form.add_ons || []), line];
    setForm({ ...form, add_ons: next });
    setAddOnDraft({ name: "", qty: "" });
  };

  const categorizedInclusions = (() => {
    const base = {
      "Event Setup & Furniture": [],
      "Dining & Service Inventory": []
    };

    (form.inclusions || []).forEach((line, index) => {
      const raw = String(line || "");
      const split = raw.split(" - ");
      const category = split[0];
      const rest = split.length > 1 ? split.slice(1).join(" - ") : raw;
      if (base[category]) {
        base[category].push({ text: rest, index });
      }
    });

    return base;
  })();

  const removeAddOn = (index) => {
    const next = (form.add_ons || []).filter((_, i) => i !== index);
    setForm({ ...form, add_ons: next });
  };

  const submit = async () => {
    const data = new FormData();

    const allowedKeys = [
      "name",
      "size",
      "description",
      "fullDescription",
      "price_min",
      "price_max",
      "available",
      "inclusions",
      "add_ons"
    ];

    allowedKeys.forEach((k) => {
      const v = form[k];
      if (v === undefined || v === null) return;
      if ((k === "inclusions" || k === "add_ons") && Array.isArray(v)) {
        data.append(k, v.join(", "));
        return;
      }
      data.append(k, v);
    });

    if (file) data.append("image", file);

    try {
      if (form._id) {
        await AdminAPI.updatePackage(form._id, data);
        notify("Package updated.", "success");
      } else {
        await AdminAPI.createPackage(data);
        notify("Package created.", "success");
      }
    } catch (err) {
      notify(err.response?.data?.message || "We could not save the package. Please try again.", "error");
      return;
    }

    setShow(false);
    setForm(initialFormState);
    setFile(null);
    load();
  };

  const edit = (p) => {
    setForm({
      ...p,
      inclusions: Array.isArray(p.inclusions) ? p.inclusions : [],
      add_ons: Array.isArray(p.add_ons) ? p.add_ons : []
    });
    setInclusionDraft({ category: "", item: "", qty: "" });
    setAddOnDraft({ name: "", qty: "" });
    setShow(true);
  };

  const remove = (id) =>
    AdminAPI.deletePackage(id)
      .then(() => {
        notify("Package deleted.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not delete the package. Please try again.", "error"));

  const toggleAvailability = (pkg) =>
    AdminAPI.updatePackage(pkg._id, { available: !pkg.available })
      .then(() => {
        notify(pkg.available ? "Package disabled." : "Package enabled.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not update the package. Please try again.", "error"));

  const list = packages;

  const formatMoney = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toLocaleString("en-PH") : "0";
  };

  const formatPrice = (pkg) => {
    const min = Number(pkg?.price_min);
    const max = Number(pkg?.price_max);
    if (Number.isFinite(min) && Number.isFinite(max) && min === max) return `₱${formatMoney(min)}`;
    if (Number.isFinite(min) && Number.isFinite(max)) return `₱${formatMoney(min)} - ${formatMoney(max)}`;
    if (Number.isFinite(min)) return `₱${formatMoney(min)}`;
    if (Number.isFinite(max)) return `₱${formatMoney(max)}`;
    return "₱0";
  };

  const getInclusionPreview = (pkg) => {
    const inclusions = Array.isArray(pkg?.inclusions) ? pkg.inclusions : [];
    const prefix = "Event Setup & Furniture - ";
    const filtered = inclusions
      .filter((item) => String(item || "").startsWith(prefix))
      .map((item) => String(item || "").slice(prefix.length));
    const preview = filtered.slice(0, 4);
    if (preview.length >= 4) return preview;
    return [...preview, ...Array.from({ length: 4 - preview.length }, () => "—")];
  };

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Packages</h1>
          <p>Create and manage event packages</p>
        </div>
        <div className="admin-actions">
          <button
            className="btn"
            onClick={() => {
              setForm(initialFormState);
              setFile(null);
              setInclusionDraft({ category: "", item: "", qty: "" });
              setAddOnDraft({ name: "", qty: "" });
              setShow(true);
            }}
          >
            + Add New Package
          </button>
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}
      <div className="admin-card-grid package-grid">
        {list.length === 0 && <p>No packages yet.</p>}
        {list.map((p) => (
          <div className="package-card" key={p._id}>
            <div className="package-card-media">
              {p.image_url ? <img src={p.image_url} alt={p.name} /> : <div className="package-thumb" />}
              <div className="package-card-statusbar">
                <div className="package-card-status-text">
                  <div className="package-card-status-label">Current Status</div>
                  <div className="package-card-status-sub">
                    {p.available === false ? "Unavailable Package" : "Available Package"}
                  </div>
                </div>
                <label className="switch" aria-label="Toggle package availability">
                  <input
                    type="checkbox"
                    checked={p.available !== false}
                    onChange={() => toggleAvailability(p)}
                  />
                  <span className="slider" />
                </label>
              </div>

              <div className="package-card-hero">
                <h3 className="package-card-title">{p.name}</h3>
                <p className="package-card-desc">{p.description || ""}</p>
              </div>
            </div>

            <div className="package-card-body">
              <div className="package-card-kv">
                <div className="package-card-kv-row">
                  <span className="package-card-k">Size:</span>
                  <span className="package-card-v">{p.size || "-"}</span>
                </div>
                <div className="package-card-kv-row">
                  <span className="package-card-v">{formatPrice(p)}</span>
                </div>
              </div>

              <div className="package-card-inclusions">
                <div className="package-card-inclusions-title">Packages included:</div>
                <div className="package-card-inclusions-grid">
                  {getInclusionPreview(p).map((item, index) => (
                    <div className="package-card-inclusion" key={`${p._id}-inc-${index}`}>
                      <span className="package-card-check">✓</span>
                      <span className="package-card-inc-text">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="package-card-actions">
                <button className="pkg-action edit" type="button" onClick={() => edit(p)} aria-label="Edit package">✎</button>
                <button className="pkg-action delete" type="button" onClick={() => remove(p._id)} aria-label="Delete package">🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {show && (
        <Modal
          title={form._id ? "Edit Package" : "Add New Package"}
          onClose={() => setShow(false)}
          className="modal-wide"
        >
          <div className="admin-modal package-form-modal">
            <p className="modal-subtitle">Create a new event package and define its inclusions.</p>
            <div className="form-section">
              <h4>Basic Information</h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Package Name</label>
                  <input
                    placeholder="Birthday Package 1"
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Package Size</label>
                  <input
                    placeholder="20x70"
                    value={form.size || ""}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Short Description</label>
                <textarea
                  placeholder="Perfect for intimate gatherings"
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows="3"
                />
              </div>
            </div>

            <div className="form-section">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    placeholder="15000"
                    value={form.price_min || ""}
                    onChange={(e) => setForm({ ...form, price_min: e.target.value, price_max: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Current Status</label>
                  <div className="status-row">
                    <div className="status-meta">
                      <div className={`badge-status ${form.available === false ? "inactive" : "active"}`}>
                        {form.available === false ? "Unavailable" : "Available"}
                      </div>
                      <div className="status-hint">Package availability</div>
                    </div>

                    <label className="switch" aria-label="Toggle package availability">
                      <input
                        type="checkbox"
                        checked={form.available !== false}
                        onChange={(e) => setForm({ ...form, available: e.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Detailed Information</h4>
              <div className="form-group">
                <label>About This Package</label>
                <textarea
                  placeholder="Enter the full package description, features, and highlights..."
                  value={form.fullDescription || ""}
                  onChange={(e) => setForm({ ...form, fullDescription: e.target.value })}
                  rows="4"
                />
              </div>
            </div>

            <div className="form-section">
              <h4>Services, Inclusions and Add-Ons</h4>

              <div className="subsection">
                <div className="subsection-card">
                  <div className="subsection-card-head">
                    <h5>Services &amp; Inclusions</h5>
                    <p className="subsection-hint">
                      Add items with categories and quantities (e.g., Plates, Stage Setup)
                    </p>
                  </div>

                  <div className="inline-add-row inclusion-row">
                    <select
                      value={inclusionDraft.category}
                      onChange={(e) => setInclusionDraft((prev) => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Category</option>
                      <option value="Event Setup & Furniture">Event Setup &amp; Furniture</option>
                      <option value="Dining & Service Inventory">Dining &amp; Service Inventory</option>
                    </select>

                    <input
                      placeholder="Item name"
                      value={inclusionDraft.item}
                      onChange={(e) => setInclusionDraft((prev) => ({ ...prev, item: e.target.value }))}
                    />

                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={inclusionDraft.qty}
                      onChange={(e) => setInclusionDraft((prev) => ({ ...prev, qty: e.target.value }))}
                    />

                    <button
                      type="button"
                      className="btn"
                      onClick={addInclusion}
                      disabled={!inclusionDraft.category || !String(inclusionDraft.item || "").trim()}
                    >
                      Add
                    </button>
                  </div>

                  {inclusionCategories.some((category) => categorizedInclusions[category]?.length) && (
                    <div className="inclusion-groups">
                      {inclusionCategories.map((category) => (
                        categorizedInclusions[category]?.length ? (
                          <div className="inclusion-group" key={category}>
                            <div className="inclusion-group-title">{category}</div>
                            <div className="chip-list">
                              {categorizedInclusions[category].map((item) => (
                                <div className="chip" key={`${category}-${item.index}`}>
                                  <span>{item.text}</span>
                                  <button type="button" className="chip-x" onClick={() => removeInclusion(item.index)}>×</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="subsection">
                <div className="subsection-card">
                  <div className="subsection-card-head">
                    <h5>Add-Ons</h5>
                    <p className="subsection-hint">
                      Optional items that can be added (e.g., Videoke, Candy Corner)
                    </p>
                  </div>

                  <div className="inline-add-row addon-row">
                    <input
                      placeholder="Add-on name"
                      value={addOnDraft.name}
                      onChange={(e) => setAddOnDraft((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={addOnDraft.qty}
                      onChange={(e) => setAddOnDraft((prev) => ({ ...prev, qty: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={addAddOn}
                      disabled={!String(addOnDraft.name || "").trim()}
                    >
                      Add
                    </button>
                  </div>

                  {Array.isArray(form.add_ons) && form.add_ons.length > 0 && (
                    <div className="chip-list">
                      {form.add_ons.map((item, index) => (
                        <div className="chip" key={`${item}-${index}`}>
                          <span>{item}</span>
                          <button type="button" className="chip-x" onClick={() => removeAddOn(index)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Media Upload</h4>
              <label className="upload-box">
                <div className="upload-icon">📷</div>
                <div className="upload-text">
                  <p className="upload-main">Drag and drop or click to upload cover image</p>
                  <p className="upload-hint">Landscape banner format recommended (PNG, JPG up to 10MB)</p>
                </div>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
              </label>
              {file && <p className="upload-selected">Selected: {file.name}</p>}
            </div>

            <div className="actions">
              <button className="btn-outline" type="button" onClick={() => setShow(false)}>
                Cancel
              </button>
              <button className="btn" onClick={submit}>
                {form._id ? "Update Package" : "Add Package"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
