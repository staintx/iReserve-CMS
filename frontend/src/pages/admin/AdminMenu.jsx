import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import AdminMenuForm from "../../components/forms/AdminMenuForm";
import useToast from "../../hooks/useToast";

export default function AdminMenu() {
  const [menu, setMenu] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const { notify } = useToast();

  const load = () => AdminAPI.getMenu().then((res) => setMenu(Array.isArray(res.data) ? res.data : []));
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

    try {
      if (form._id) {
        await AdminAPI.updateMenu(form._id, data);
        notify("Menu item updated.", "success");
      } else {
        await AdminAPI.createMenu(data);
        notify("Menu item created.", "success");
      }
    } catch (err) {
      notify(err.response?.data?.message || "We could not save the menu item. Please try again.", "error");
      return;
    }

    setShow(false); setForm({}); setFile(null); load();
  };

  const edit = (m) => { setForm(m); setShow(true); };
  const remove = (id) =>
    AdminAPI.deleteMenu(id)
      .then(() => {
        notify("Menu item deleted.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not delete the menu item. Please try again.", "error"));
  const toggleAvailability = (item) =>
    AdminAPI.updateMenu(item._id, { ...item, available: !item.available })
      .then(() => {
        notify(item.available ? "Menu item disabled." : "Menu item enabled.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not update the menu item. Please try again.", "error"));

  const list = menu;
  const categories = ["All", "Main Dishes", "Pasta", "Rice", "Desserts", "Drinks"];
  const filtered = list.filter((item) => {
    const matchesQuery =
      item.name?.toLowerCase().includes(query.toLowerCase()) ||
      item.category?.toLowerCase().includes(query.toLowerCase());

    const matchesCategory = activeCategory === "All" ? true : item.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Food Menu</h1>
          <p>Manage food menu items and availability</p>
        </div>
        <div className="admin-actions">
          <button className="btn" onClick={() => setShow(true)}>+ Add Menu Item</button>
        </div>
      </div>

      <div className="admin-actions" style={{ marginBottom: "14px" }}>
        <div className="tab-row" role="tablist" aria-label="Menu categories">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={c === activeCategory ? "active" : ""}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-actions" style={{ marginBottom: "12px" }}>
        <div className="admin-search">
          <input placeholder="Search by item or category" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="admin-table-wrap">
        {list.length === 0 && <p>No menu items yet.</p>}
        {list.length > 0 && (
          <div className="admin-card-grid menu-grid">
            {filtered.map((item) => (
              <div key={item._id} className="package-card">
                <div className="package-card-media">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} />
                  ) : (
                    <div className="package-thumb" aria-hidden="true" />
                  )}

                  <div className="package-card-statusbar">
                    <div className="package-card-status-text">
                      <div className="package-card-status-label">Current Status</div>
                      <div className="package-card-status-sub">{item.available ? "Available" : "Unavailable"}</div>
                    </div>

                    <label className="switch" aria-label="Toggle availability">
                      <input
                        type="checkbox"
                        checked={item.available !== false}
                        onChange={() => toggleAvailability(item)}
                      />
                      <span className="slider" />
                    </label>
                  </div>
                </div>

                <div className="package-card-body">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="package-card-title" style={{ color: "#111827", textShadow: "none" }}>
                      {item.name}
                    </h3>
                    {item.category ? <span className="pill muted">{item.category}</span> : null}
                  </div>

                  {item.description ? (
                    <p className="package-card-desc" style={{ color: "#6b7280", textShadow: "none" }}>
                      {item.description}
                    </p>
                  ) : null}

                  <div className="package-card-actions">
                    {item._id?.startsWith("mock-") ? null : (
                      <>
                        <button className="pkg-action edit" type="button" onClick={() => edit(item)} aria-label="Edit">
                          ✎
                        </button>
                        <button className="pkg-action delete" type="button" onClick={() => remove(item._id)} aria-label="Delete">
                          🗑
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {show && (
        <Modal title="Add New Menu Item" className="menu-form-modal" onClose={() => setShow(false)}>
          <AdminMenuForm
            form={form}
            setForm={setForm}
            file={file}
            setFile={setFile}
            onCancel={() => setShow(false)}
            onSubmit={submit}
            submitLabel={form._id ? "Save Changes" : "Add Item"}
          />
        </Modal>
      )}
    </AdminLayout>
  );
}