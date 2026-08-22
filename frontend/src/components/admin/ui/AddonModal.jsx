import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import Btn from "./Btn";
import { Switch } from "../../ui/switch";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export default function AddonModal({ addon, onClose, onSave }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    available: true,
  });

  useEffect(() => {
    if (addon) {
      setFormData({
        name: addon.name || "",
        description: addon.description || "",
        available: addon.available !== false,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        available: true,
      });
    }
  }, [addon]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      notify("Please provide an addon name", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        available: formData.available,
      };

      if (addon && addon._id) {
        await AdminAPI.updateAddon(addon._id, payload);
        notify("Addon updated successfully", "success");
      } else {
        await AdminAPI.createAddon(payload);
        notify("Addon created successfully", "success");
      }
      onSave();
    } catch (error) {
      notify(error.response?.data?.message || "Failed to save addon", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-foreground text-lg">
            {addon ? "Edit Addon" : "Add Addon"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Addon Name</label>
              <input
                type="text"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="e.g. Entourage Setup, Extra Chairs"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-24 resize-none transition-colors"
                placeholder="Brief description of the addon..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2.5">
              <div>
                <p className="text-sm text-gray-700 font-medium">Availability</p>
                <p className="text-xs text-gray-500">{formData.available ? "Available" : "Unavailable (Disabled)"}</p>
              </div>
              <Switch
                checked={formData.available}
                onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
            <Btn variant="secondary" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Btn>
            <Btn variant="primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : addon ? "Save Changes" : "Save Addon"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
