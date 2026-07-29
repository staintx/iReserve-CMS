import React, { useState, useEffect } from "react";
import { Plus, Search, Edit3, Trash2, Check, Clock, XCircle, MoreHorizontal } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { KANBAN_DATA } from "../../components/admin/ui/data";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import PackageModal from "../../components/admin/ui/PackageModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";

export default function AdminPackages() {
  const { notify } = useToast();
  const [tab, setTab] = useState("standard");
  const [search, setSearch] = useState("");
  
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [activePkg, setActivePkg] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadData = () => {
    setLoading(true);
    AdminAPI.getPackages()
      .then(res => setPackages(res.data))
      .catch(err => notify("Failed to load packages", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (pkg = null) => {
    setActivePkg(pkg);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActivePkg(null);
  };

  const handleDelete = (id) => {
    AdminAPI.deletePackage(id)
      .then(() => {
        notify("Package deleted successfully", "success");
        setCancelTarget(null);
        loadData();
      })
      .catch(err => notify(err.response?.data?.message || "Failed to delete package", "error"));
  };

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Service Management</h2>
          <Btn variant="gold" size="sm" onClick={() => handleOpenModal()}><Plus size={13} /> New Package</Btn>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button 
            onClick={() => setTab("standard")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === "standard" ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Standard Packages
          </button>
          <button 
            onClick={() => setTab("custom")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${tab === "custom" ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Custom Quote Reviews
          </button>
        </div>

        {tab === "standard" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 max-w-sm">
              <Search size={14} className="text-[#9CA3AF]" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search packages..." 
                className="bg-transparent text-sm focus:outline-none flex-1" 
                style={{ fontFamily: "Inter, sans-serif" }} 
              />
            </div>
            
            {loading ? (
              <div className="text-center py-10 text-gray-500">Loading packages...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {packages.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())).map(pkg => (
                  <AdminCard key={pkg._id} className="!p-5 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-[#111]">{pkg.name}</h3>
                        <p className="text-xs text-[#6B7280]">PKG-{pkg._id.substring(pkg._id.length - 6).toUpperCase()}</p>
                      </div>
                      <Badge status={pkg.available ? "available" : "unavailable"} />
                    </div>
                    {pkg.image_url && (
                      <div className="w-full h-32 mb-3 rounded-lg overflow-hidden bg-gray-100">
                        <img src={pkg.image_url} alt={pkg.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="mb-3">
                      {pkg.package_type === "Food Only" ? (
                        <p className="text-lg font-bold text-[#D4AF37]">Varies by Menu</p>
                      ) : pkg.package_type === "Event Setup Only" ? (
                        <p className="text-lg font-bold text-[#D4AF37]">{fmt(pkg.setup_price)}<span className="text-xs text-gray-500 font-normal"> (Total Setup)</span></p>
                      ) : (
                        <p className="text-lg font-bold text-[#D4AF37]">{fmt(pkg.price_per_guest)}<span className="text-xs text-gray-500 font-normal">/pax</span></p>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Inclusions</p>
                    <ul className="space-y-1 mb-4 h-24 overflow-y-auto">
                      {(pkg.inclusions || []).slice(0, 4).map((inc, i) => (
                        <li key={i} className="text-sm text-[#374151] flex items-center gap-2 truncate" title={inc}>
                          <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full flex-shrink-0" /> <span className="truncate">{inc}</span>
                        </li>
                      ))}
                      {(pkg.inclusions || []).length > 4 && (
                        <li className="text-xs text-gray-400 italic">+{pkg.inclusions.length - 4} more items</li>
                      )}
                      {(pkg.inclusions || []).length === 0 && (
                        <li className="text-sm text-gray-400 italic">No inclusions specified</li>
                      )}
                    </ul>
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <Btn variant="secondary" size="sm" className="flex-1 justify-center" onClick={() => handleOpenModal(pkg)}><Edit3 size={13} /> Edit</Btn>
                      <Btn variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setCancelTarget(pkg)}><Trash2 size={13} /></Btn>
                    </div>
                  </AdminCard>
                ))}
                {packages.length === 0 && <div className="col-span-full text-center py-10 text-gray-500">No packages found.</div>}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
            {Object.entries(KANBAN_DATA).map(([column, items]) => (
              <div key={column} className="flex-shrink-0 w-80 bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-[#111] text-sm">{column}</h3>
                  <span className="text-xs font-bold bg-white text-[#6B7280] px-2 py-0.5 rounded-full border border-gray-200">{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.map(item => (
                    <AdminCard key={item.id} className="!p-4 cursor-pointer hover:border-[#D4AF37] transition-colors shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-mono font-bold text-[#D4AF37]">{item.id}</span>
                        <MoreHorizontal size={14} className="text-[#9CA3AF]" />
                      </div>
                      <p className="font-bold text-[#111] text-sm">{item.customer}</p>
                      <p className="text-xs text-[#6B7280] mb-3">{item.date} · {item.guests} pax</p>
                      
                      <div className="bg-gray-50 rounded-lg p-2 mb-3 border border-gray-100">
                        <p className="text-xs text-[#374151]"><strong>Menu:</strong> {item.menu}</p>
                        <p className="text-[11px] text-[#6B7280] mt-1 italic">"{item.requests}"</p>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="font-bold text-[#111] text-sm">{item.budget}</span>
                        <div className="flex gap-1">
                          {column === "Pending Review" && <button className="w-6 h-6 flex items-center justify-center rounded bg-blue-50 text-blue-500 hover:bg-blue-100"><Clock size={12} /></button>}
                          {column !== "Approved" && <button className="w-6 h-6 flex items-center justify-center rounded bg-emerald-50 text-emerald-500 hover:bg-emerald-100"><Check size={12} /></button>}
                          {column !== "Rejected" && <button className="w-6 h-6 flex items-center justify-center rounded bg-red-50 text-red-500 hover:bg-red-100"><XCircle size={12} /></button>}
                        </div>
                      </div>
                    </AdminCard>
                  ))}
                  {items.length === 0 && (
                    <div className="p-4 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-medium">
                      No custom quotes
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <PackageModal 
          pkg={activePkg} 
          onClose={handleCloseModal} 
          onSave={() => {
            handleCloseModal();
            loadData();
          }} 
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Delete Package"
          message={`Are you sure you want to delete the package "${cancelTarget.name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(cancelTarget._id)}
          onCancel={() => setCancelTarget(null)}
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}
    </AdminLayout>
  );
}
