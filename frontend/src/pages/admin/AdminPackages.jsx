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
  const [error, setError] = useState("");
  const { notify } = useToast();

  const initialFormState = {
    name: "",
    size: "",
    description: "",
    fullDescription: "",
    price_min: "",
    price_max: "",
    available: true,
    booking_requirements: "",
    cancellation_policy: "",
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

  const handleAddInclusionCategory = () => {
    const newInclusions = [...(form.inclusions || []), { category: "", items: [] }];
    setForm({ ...form, inclusions: newInclusions });
  };

  const handleUpdateInclusionCategory = (index, category) => {
    const newInclusions = [...(form.inclusions || [])];
    newInclusions[index].category = category;
    setForm({ ...form, inclusions: newInclusions });
  };

  const handleAddInclusionItem = (categoryIndex) => {
    const newInclusions = [...(form.inclusions || [])];
    newInclusions[categoryIndex].items.push({ name: "", quantity: 1 });
    setForm({ ...form, inclusions: newInclusions });
  };

  const handleUpdateInclusionItem = (categoryIndex, itemIndex, field, value) => {
    const newInclusions = [...(form.inclusions || [])];
    newInclusions[categoryIndex].items[itemIndex][field] = field === "quantity" ? Number(value) : value;
    setForm({ ...form, inclusions: newInclusions });
  };

  const handleRemoveInclusionItem = (categoryIndex, itemIndex) => {
    const newInclusions = [...(form.inclusions || [])];
    newInclusions[categoryIndex].items.splice(itemIndex, 1);
    setForm({ ...form, inclusions: newInclusions });
  };

  const handleRemoveInclusionCategory = (index) => {
    const newInclusions = (form.inclusions || []).filter((_, i) => i !== index);
    setForm({ ...form, inclusions: newInclusions });
  };

  const handleAddAddOn = () => {
    const newAddOns = [...(form.add_ons || []), { name: "", quantity: 1 }];
    setForm({ ...form, add_ons: newAddOns });
  };

  const handleUpdateAddOn = (index, field, value) => {
    const newAddOns = [...(form.add_ons || [])];
    newAddOns[index][field] = field === "quantity" ? Number(value) : value;
    setForm({ ...form, add_ons: newAddOns });
  };

  const handleRemoveAddOn = (index) => {
    const newAddOns = (form.add_ons || []).filter((_, i) => i !== index);
    setForm({ ...form, add_ons: newAddOns });
  };

  const submit = async () => {
    const data = new FormData();

    Object.entries(form).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (k === "inclusions" || k === "add_ons") {
        data.append(k, JSON.stringify(v));
      } else {
        data.append(k, v);
      }
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
              setShow(true);
            }}
          >
            + Add New Package
          </button>
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}
      <div className="admin-card-grid">
        {list.length === 0 && <p>No packages yet.</p>}
        {list.map((p) => (
          <div className="package-tile" key={p._id}>
            {p.image_url ? <img src={p.image_url} alt={p.name} /> : <div className="package-thumb" />}
            <div className="package-meta">
              <h4>{p.name}</h4>
              <p>Size: {p.size || "-"}</p>
              <p>
                PHP {p.price_min || 0} - {p.price_max || 0}
              </p>
            </div>
            <div className="tile-actions">
              <button className="edit" type="button" onClick={() => edit(p)}>
                Edit
              </button>
              <button className="edit" type="button" onClick={() => toggleAvailability(p)}>
                {p.available === false ? "Enable" : "Disable"}
              </button>
              <button className="delete" type="button" onClick={() => remove(p._id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {show && (
        <Modal title={form._id ? "Edit Package" : "Add New Package"} onClose={() => setShow(false)}>
          <div className="admin-modal package-form-modal">
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
              <h4>Pricing and Status</h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Price (Min)</label>
                  <input
                    type="number"
                    placeholder="15000"
                    value={form.price_min || ""}
                    onChange={(e) => setForm({ ...form, price_min: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Price (Max)</label>
                  <input
                    type="number"
                    placeholder="20000"
                    value={form.price_max || ""}
                    onChange={(e) => setForm({ ...form, price_max: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group toggle-row">
                <label>Current Status</label>
                <div className="toggle-control">
                  <select
                    value={form.available === false ? "no" : "yes"}
                    onChange={(e) => setForm({ ...form, available: e.target.value === "yes" })}
                    className="status-select"
                  >
                    <option value="yes">Available</option>
                    <option value="no">Unavailable</option>
                  </select>
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
              <div className="form-group">
                <label>Booking Requirements</label>
                <textarea
                  placeholder="Enter booking requirements..."
                  value={form.booking_requirements || ""}
                  onChange={(e) => setForm({ ...form, booking_requirements: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Cancellation Policy</label>
                <textarea
                  placeholder="Enter cancellation policy..."
                  value={form.cancellation_policy || ""}
                  onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })}
                  rows="3"
                />
              </div>
            </div>

            <div className="form-section">
              <h4>Services, Inclusions and Add-Ons</h4>

              <div className="subsection">
                <h5>Services and Inclusions</h5>
                <p className="subsection-hint">
                  Add items with categories and quantities (e.g., Plates, Stage Setup)
                </p>

                {form.inclusions && form.inclusions.length > 0
                  ? form.inclusions.map((category, catIndex) => (
                      <div key={catIndex} className="inclusion-category">
                        <div className="form-group">
                          <label>Category</label>
                          <input
                            placeholder="e.g., Venue, Catering, Entertainment"
                            value={category.category || ""}
                            onChange={(e) => handleUpdateInclusionCategory(catIndex, e.target.value)}
                          />
                        </div>

                        <div className="category-items">
                          {category.items && category.items.length > 0
                            ? category.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="form-grid-2 item-row">
                                  <input
                                    placeholder="Item name"
                                    value={item.name || ""}
                                    onChange={(e) =>
                                      handleUpdateInclusionItem(catIndex, itemIndex, "name", e.target.value)
                                    }
                                  />
                                  <div className="qty-input-group">
                                    <input
                                      type="number"
                                      placeholder="Qty"
                                      min="1"
                                      value={item.quantity || 1}
                                      onChange={(e) =>
                                        handleUpdateInclusionItem(
                                          catIndex,
                                          itemIndex,
                                          "quantity",
                                          e.target.value
                                        )
                                      }
                                      className="qty-input"
                                    />
                                    <button
                                      type="button"
                                      className="btn-small-delete"
                                      onClick={() => handleRemoveInclusionItem(catIndex, itemIndex)}
                                    >
                                      x
                                    </button>
                                  </div>
                                </div>
                              ))
                            : null}
                        </div>

                        <button
                          type="button"
                          className="btn-add-item"
                          onClick={() => handleAddInclusionItem(catIndex)}
                        >
                          + Add Item
                        </button>

                        <button
                          type="button"
                          className="btn-remove-category"
                          onClick={() => handleRemoveInclusionCategory(catIndex)}
                        >
                          Remove Category
                        </button>
                      </div>
                    ))
                  : null}

                <button type="button" className="btn-outline" onClick={handleAddInclusionCategory}>
                  + Add Category
                </button>
              </div>

              <div className="subsection">
                <h5>Add-Ons</h5>
                <p className="subsection-hint">
                  Optional items that can be added (e.g., Videoke, Candy Corner)
                </p>

                {form.add_ons && form.add_ons.length > 0
                  ? form.add_ons.map((addOn, index) => (
                      <div key={index} className="form-grid-2 addon-row">
                        <input
                          placeholder="Add-on name"
                          value={addOn.name || ""}
                          onChange={(e) => handleUpdateAddOn(index, "name", e.target.value)}
                        />
                        <div className="qty-input-group">
                          <input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            value={addOn.quantity || 1}
                            onChange={(e) => handleUpdateAddOn(index, "quantity", e.target.value)}
                            className="qty-input"
                          />
                          <button
                            type="button"
                            className="btn-small-delete"
                            onClick={() => handleRemoveAddOn(index)}
                          >
                            x
                          </button>
                        </div>
                      </div>
                    ))
                  : null}

                <button type="button" className="btn-outline" onClick={handleAddAddOn}>
                  + Add Add-On
                </button>
              </div>
            </div>

            <div className="form-section">
              <h4>Media Upload</h4>
              <label className="upload-box">
                <div className="upload-icon">Upload</div>
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
