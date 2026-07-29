import React, { useState, useEffect } from "react";
import { Search, Plus, Filter, Edit3, Trash2 } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import InventoryModal from "../../components/admin/ui/InventoryModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function AdminInventory() {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const categories = ["all", "Equipment", "Furniture", "Tableware", "Decorations"];

  const loadData = () => {
    setLoading(true);
    // Use getAvailability to also get reserved quantities
    AdminAPI.getInventory()
      .then(res => setInventory(res.data))
      .catch(err => notify("Failed to load inventory", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (item = null) => {
    setActiveItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveItem(null);
  };

  const handleDelete = (id) => {
    AdminAPI.deleteInventory(id)
      .then(() => {
        notify("Inventory item deleted successfully", "success");
        setCancelTarget(null);
        loadData();
      })
      .catch(err => notify(err.response?.data?.message || "Failed to delete item", "error"));
  };

  const filtered = inventory.filter(i => {
    const matchSearch = !search || (i.item_name && i.item_name.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = filter === "all" || i.category === filter;
    return matchSearch && matchCategory;
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Inventory Management</h2>
          <Btn variant="gold" size="sm" onClick={() => handleOpenModal()}><Plus size={13} /> Add Item</Btn>
        </div>

        <AdminCard className="!p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 min-w-48">
              <Search size={14} className="text-[#9CA3AF]" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search inventory..." 
                className="bg-transparent text-sm focus:outline-none flex-1" 
                style={{ fontFamily: "Inter, sans-serif" }} 
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {categories.map(c => (
                <button 
                  key={c} 
                  onClick={() => setFilter(c)} 
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${filter === c ? "bg-[#111827] text-white" : "bg-gray-100 text-[#6B7280] hover:bg-gray-200"}`}
                >
                  {c}
                </button>
              ))}
            </div>
            <Btn variant="secondary" size="sm"><Filter size={13} /> Filters</Btn>
          </div>
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]" style={{ fontFamily: "Inter, sans-serif" }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Item Name","Category","Total Stock","Reserved","Available","Min Stock","Status","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-[#6B7280] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="8" className="text-center py-8 text-gray-500">Loading inventory...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="8" className="text-center py-8 text-gray-500">No inventory found.</td></tr>
                ) : (
                  filtered.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-semibold text-[#111]">{item.item_name}</td>
                      <td className="px-4 py-3 text-xs text-[#374151]">{item.category}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#111] text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-xs text-orange-600 font-semibold text-center">{item.reserved_quantity || 0}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-600 text-center">{item.available_quantity || 0}</td>
                      <td className="px-4 py-3 text-xs text-[#6B7280] text-center">{item.minStock || 0}</td>
                      <td className="px-4 py-3"><Badge status={item.available ? "available" : "unavailable"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleOpenModal(item)} className="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]"><Edit3 size={13} /></button>
                          <button onClick={() => setCancelTarget(item)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>

      {showModal && (
        <InventoryModal 
          item={activeItem} 
          onClose={handleCloseModal} 
          onSave={() => {
            handleCloseModal();
            loadData();
          }} 
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Delete Item"
          message={`Are you sure you want to delete "${cancelTarget.item_name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(cancelTarget._id)}
          onCancel={() => setCancelTarget(null)}
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}
    </AdminLayout>
  );
}