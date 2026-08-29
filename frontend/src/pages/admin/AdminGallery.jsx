import React, { useState, useEffect } from "react";
import { Search, Plus, Filter, Edit3, Trash2 } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import GalleryModal from "../../components/admin/ui/GalleryModal";

export default function AdminGallery() {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const categories = ["all", "Weddings", "Birthday", "Corporate Events", "Food Display"];

  const loadData = () => {
    setLoading(true);
    AdminAPI.getGallery()
      .then(res => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(err => notify("Failed to load gallery items", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealTimeRefresh(loadData);

  const handleOpenModal = (item = null) => {
    setActiveItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveItem(null);
  };

  const handleDelete = (id) => {
    AdminAPI.deleteGallery(id)
      .then(() => {
        notify("Gallery item deleted successfully", "success");
        setCancelTarget(null);
        loadData();
      })
      .catch(err => notify(err.response?.data?.message || "Failed to delete gallery item", "error"));
  };

  const filtered = items.filter(i => {
    const matchSearch = !search || (i.title && i.title.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = filter === "all" || i.category === filter;
    return matchSearch && matchCategory;
  });

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Gallery Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage portfolio event photos and showcase media.</p>
          </div>
          <Btn variant="primary" size="sm" onClick={() => handleOpenModal()} className="self-start sm:self-auto"><Plus size={13} /> Add Gallery Item</Btn>
        </div>

        <AdminCard className="!p-3.5 sm:!p-4">

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-muted/60 border border-border/70 rounded-md px-3 py-1.5 flex-1 min-w-48 shadow-2xs">
              <Search size={14} className="text-muted-foreground/70" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search gallery items..." 
                className="bg-transparent text-xs sm:text-sm focus:outline-none flex-1 text-foreground" 
                style={{ fontFamily: "var(--font-sans, Inter), sans-serif" }} 
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {categories.map(c => (
                <button 
                  key={c} 
                  onClick={() => setFilter(c)} 
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all cursor-pointer ${filter === c ? "bg-primary text-white shadow-2xs" : "bg-muted text-muted-foreground hover:bg-border/80 hover:text-foreground"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </AdminCard>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading gallery...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(item => (
              <AdminCard key={item._id} className="!p-0 hover:shadow-md transition-all overflow-hidden flex flex-col hover:border-slate-300">
                {item.image_url ? (
                  <div className="w-full h-48 bg-gray-100 overflow-hidden">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                    No Image
                  </div>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-foreground leading-tight mb-1">{item.title}</h3>
                      <span className="text-[10px] font-bold font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/80 uppercase tracking-wider inline-block">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end">
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
              <div className="col-span-full text-center py-10 text-gray-500">No gallery items found.</div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <GalleryModal 
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
          title="Delete Gallery Item"
          message={`Are you sure you want to delete "${cancelTarget.title}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(cancelTarget._id)}
          onCancel={() => setCancelTarget(null)}
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}
    </AdminLayout>
  );
}