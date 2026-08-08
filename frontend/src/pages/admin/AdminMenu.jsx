import React, { useState, useEffect } from "react";
import { Search, Plus, Filter, Edit3, Trash2 } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import MenuModal from "../../components/admin/ui/MenuModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function AdminMenu() {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const categories = ["all", "Appetizer", "Soup", "Salad", "Main Course", "Pasta", "Dessert", "Beverage"];

  const loadData = () => {
    setLoading(true);
    AdminAPI.getMenu()
      .then(res => setMenuItems(res.data))
      .catch(err => notify("Failed to load menu items", "error"))
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
    AdminAPI.deleteMenu(id)
      .then(() => {
        notify("Menu item deleted successfully", "success");
        setCancelTarget(null);
        loadData();
      })
      .catch(err => notify(err.response?.data?.message || "Failed to delete menu item", "error"));
  };

  const filtered = menuItems.filter(i => {
    const matchSearch = !search || (i.name && i.name.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = filter === "all" || i.category === filter;
    return matchSearch && matchCategory;
  });

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-background min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-foreground">Food Menu Management</h2>
          <Btn variant="primary" size="sm" onClick={() => handleOpenModal()}><Plus size={13} /> Add Food Menu Item</Btn>
        </div>

        <AdminCard className="!p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 min-w-48">
              <Search size={14} className="text-muted-foreground/70" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search menu items..." 
                className="bg-transparent text-sm focus:outline-none flex-1" 
                style={{ fontFamily: "Inter, sans-serif" }} 
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {categories.map(c => (
                <button 
                  key={c} 
                  onClick={() => setFilter(c)} 
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${filter === c ? "bg-primary text-white" : "bg-gray-100 text-muted-foreground hover:bg-gray-200"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </AdminCard>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading menu...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(item => (
              <AdminCard key={item._id} className="!p-0 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                {item.image_url ? (
                  <div className="w-full h-40 bg-gray-100">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-foreground leading-tight mb-1">{item.name}</h3>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.category}</p>
                    </div>
                    <Badge status={item.available ? "available" : "unavailable"} />
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2 flex-1">
                    {item.description || "No description provided."}
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-lg font-bold text-foreground">{fmt(item.price)}</p>
                    <div className="flex gap-2">
                      <Btn variant="secondary" size="sm" className="px-3" onClick={() => handleOpenModal(item)}>
                        <Edit3 size={13} className="mr-1.5" /> Edit
                      </Btn>
                      <Btn variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2" onClick={() => setCancelTarget(item)}>
                        <Trash2 size={13} />
                      </Btn>
                    </div>
                  </div>
                </div>
              </AdminCard>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500">No menu items found.</div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <MenuModal 
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
          title="Delete Food Menu Item"
          message={`Are you sure you want to delete "${cancelTarget.name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(cancelTarget._id)}
          onCancel={() => setCancelTarget(null)}
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}
    </AdminLayout>
  );
}