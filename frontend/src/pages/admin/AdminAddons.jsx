import React, { useState, useEffect } from "react";
import { Plus, Edit3, Trash2, Check, XCircle } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import Modal from "../../components/common/Modal";

export default function AdminAddons() {
  const { notify } = useToast();
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [activeAddon, setActiveAddon] = useState(null);
  const [formData, setFormData] = useState({ name: "", price: 0, description: "", available: true });
  
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

  const handleOpenModal = (addon = null) => {
    if (addon) {
      setActiveAddon(addon);
      setFormData({
        name: addon.name,
        price: addon.price,
        description: addon.description || "",
        available: addon.available
      });
    } else {
      setActiveAddon(null);
      setFormData({ name: "", price: 0, description: "", available: true });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveAddon(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.price < 0) {
      notify("Please provide a valid name and price", "error");
      return;
    }

    const req = activeAddon
      ? AdminAPI.updateAddon(activeAddon._id, formData)
      : AdminAPI.createAddon(formData);

    req
      .then(() => {
        notify(`Addon ${activeAddon ? "updated" : "created"} successfully`, "success");
        handleCloseModal();
        loadData();
      })
      .catch((err) => {
        notify(err.response?.data?.message || "Failed to save addon", "error");
      });
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

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-[#F9FAFB] min-h-screen">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#111]" style={{ fontFamily: "Playfair Display, serif" }}>Global Addons</h2>
            <p className="text-sm text-[#6B7280] mt-1">Manage addons available for custom bookings</p>
          </div>
          <Btn variant="gold" size="sm" onClick={() => handleOpenModal()}>
            <Plus size={13} /> New Addon
          </Btn>
        </div>

        <AdminCard className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading addons...</div>
          ) : addons.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">No addons found. Create your first addon!</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#F9FAFB] border-b border-gray-100 text-[#6B7280]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Addon Name</th>
                    <th className="px-6 py-4 font-medium">Description</th>
                    <th className="px-6 py-4 font-medium">Price</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {addons.map((addon) => (
                    <tr key={addon._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#111]">{addon.name}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">
                        {addon.description || "—"}
                      </td>
                      <td className="px-6 py-4 font-medium text-[#111]">
                        {fmt(addon.price)}
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
                            className="p-1.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition-colors"
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

      {showModal && (
        <Modal title={activeAddon ? "Edit Addon" : "New Addon"} onClose={handleCloseModal}>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Addon Name *</label>
              <input
                required
                type="text"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Standee, Candy Corner"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₱) *</label>
              <input
                required
                type="number"
                min="0"
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description of this addon"
              ></textarea>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-[#D4AF37] focus:ring-[#D4AF37]"
                checked={formData.available}
                onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
              />
              <span className="text-sm font-medium text-gray-700">Available to customers</span>
            </label>

            <div className="flex gap-3 pt-4 border-t border-gray-100 mt-6">
              <Btn type="button" variant="ghost" className="flex-1" onClick={handleCloseModal}>Cancel</Btn>
              <Btn type="submit" variant="gold" className="flex-1">{activeAddon ? "Save Changes" : "Create Addon"}</Btn>
            </div>
          </form>
        </Modal>
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
