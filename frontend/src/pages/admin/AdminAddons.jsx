import React, { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, Check, XCircle, Tag, Sparkles } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import AddonModal from "../../components/admin/ui/AddonModal";
import AIAddonParserModal from "../../components/admin/ui/AIAddonParserModal";

export default function AdminAddons() {
  const { notify } = useToast();
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [activeAddon, setActiveAddon] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadData = () => {
    setLoading(true);
    AdminAPI.getAddons()
      .then((res) => setAddons(res.data))
      .catch((err) => notify("Failed to load addons", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealTimeRefresh(loadData);

  const handleOpenModal = (addon = null) => {
    setActiveAddon(addon);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveAddon(null);
  };

  const handleDelete = (id) => {
    AdminAPI.deleteAddon(id)
      .then(() => {
        notify("Addon deleted successfully", "success");
        setCancelTarget(null);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to delete addon", "error"));
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Playfair Display, serif" }}>Global Addons</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage add-ons, rentals, and service upgrades available for custom bookings</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAIModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200 shadow-xs hover:shadow-sm transition-all duration-200 cursor-pointer active:scale-95"
            >
              <Sparkles size={14} className="text-indigo-600 animate-pulse" />
              <span>Import with Zelle AI</span>
            </button>
            <Btn variant="primary" size="sm" onClick={() => handleOpenModal()}>
              <Plus size={13} /> Add Addon
            </Btn>
          </div>
        </div>

        <AdminCard className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading addons...</div>
          ) : addons.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No addons found. Create your first addon!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-background border-b border-gray-100 text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4 font-medium">Addon Name</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {addons.map((addon) => (
                    <tr key={addon._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{addon.name}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 max-w-[300px] truncate">
                        {addon.description || "—"}
                      </td>
                      <td className="px-6 py-4">
                        {addon.available ? (
                          <Badge variant="success" icon={<Check size={12} />}>Available</Badge>
                        ) : (
                          <Badge variant="error" icon={<XCircle size={12} />}>Unavailable</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(addon)}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => setCancelTarget(addon._id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      {/* ============ MODALS ============ */}
      {showAIModal && (
        <AIAddonParserModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onBulkSuccess={() => {
            loadData();
          }}
        />
      )}

      {showModal && (
        <AddonModal
          addon={activeAddon}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadData();
          }}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Delete Addon"
          message="Are you sure you want to delete this addon? This action cannot be undone."
          confirmText="Yes, delete"
          onConfirm={() => handleDelete(cancelTarget)}
          onCancel={() => setCancelTarget(null)}
          isDestructive
        />
      )}
    </AdminLayout>
  );
}
