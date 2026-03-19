import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import AdminInventoryTable from "../../components/tables/AdminInventoryTable";
import AdminInventoryForm from "../../components/forms/AdminInventoryForm";
import useToast from "../../hooks/useToast";

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ available: true });
  const [query, setQuery] = useState("");
  const { notify } = useToast();

  const load = () => AdminAPI.getInventory().then((res) => setItems(Array.isArray(res.data) ? res.data : []));
  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    try {
      if (form._id) {
        await AdminAPI.updateInventory(form._id, form);
        notify("Inventory item updated.", "success");
      } else {
        await AdminAPI.createInventory(form);
        notify("Inventory item created.", "success");
      }
    } catch (err) {
      notify(err.response?.data?.message || "We could not save the inventory item. Please try again.", "error");
      return;
    }
    setShow(false);
    setForm({ available: true });
    load();
  };

  const edit = (i) => { setForm(i); setShow(true); };
  const remove = (id) =>
    AdminAPI.deleteInventory(id)
      .then(() => {
        notify("Inventory item deleted.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not delete the inventory item. Please try again.", "error"));
  const toggleAvailability = (item) =>
    AdminAPI.updateInventory(item._id, { ...item, available: !item.available })
      .then(() => {
        notify(item.available ? "Inventory item disabled." : "Inventory item enabled.", "success");
        load();
      })
      .catch((err) => notify(err.response?.data?.message || "We could not update the inventory item. Please try again.", "error"));

  const mockItems = [
    { _id: "mock-1", item_name: "Chairs", quantity: 150, category: "Furniture", available: true },
    { _id: "mock-2", item_name: "Tables (Round)", quantity: 100, category: "Furniture", available: true },
    { _id: "mock-3", item_name: "Chafing Dishes", quantity: 250, category: "Kitchen", available: false }
  ];

  const list = items.length > 0 ? items : mockItems;
  const filtered = list.filter((item) =>
    item.item_name?.toLowerCase().includes(query.toLowerCase()) ||
    item.category?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="admin-page-head">
        <div className="admin-title">
          <h1>Inventory</h1>
          <p>Track equipment and supplies</p>
        </div>
        <div className="admin-actions">
          <button className="btn" onClick={() => setShow(true)}>+ Add Item</button>
        </div>
      </div>

      <div className="admin-actions" style={{ marginBottom: "12px" }}>
        <div className="admin-search">
          <input placeholder="Search by item or category" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="admin-table-wrap">
        <AdminInventoryTable
          items={filtered}
          onEdit={edit}
          onToggleAvailability={toggleAvailability}
        />
      </div>

      {show && (
        <Modal title="Add Inventory Item" onClose={() => setShow(false)}>
          <AdminInventoryForm
            form={form}
            setForm={setForm}
            onCancel={() => setShow(false)}
            onSubmit={submit}
            submitLabel={form._id ? "Save Changes" : "Add Item"}
          />
        </Modal>
      )}
    </AdminLayout>
  );
}