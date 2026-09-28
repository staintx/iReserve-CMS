import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, AlertCircle } from "lucide-react";
import Btn from "./Btn";
import { Switch } from "../../ui/switch";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

// Canonical identifier normalizer for duplicate checks
const normalizeIdentifier = (name) => {
  if (!name || typeof name !== "string") return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export default function AddonModal({ addon, onClose, onSave, existingAddons = [] }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [addonsCatalog, setAddonsCatalog] = useState(existingAddons || []);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    pricing_type: "fixed",
    available: true,
  });

  useEffect(() => {
    if (existingAddons && existingAddons.length > 0) {
      setAddonsCatalog(existingAddons);
    } else {
      AdminAPI.getAddons()
        .then((res) => setAddonsCatalog(res.data || []))
        .catch(() => {});
    }
  }, [existingAddons]);

  useEffect(() => {
    if (addon) {
      setFormData({
        name: addon.name || "",
        description: addon.description || "",
        price: addon.price !== undefined && addon.price !== null ? String(addon.price) : "",
        pricing_type: addon.pricing_type || "fixed",
        available: addon.available !== false,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        price: "",
        pricing_type: "fixed",
        available: true,
      });
    }
  }, [addon]);

  // Check if the currently entered addon already exists in catalog
  const duplicateMatch = useMemo(() => {
    const trimmedInput = (formData.name || "").trim();
    if (!trimmedInput) return null;
    const inputIdent = normalizeIdentifier(trimmedInput);
    const inputLower = trimmedInput.toLowerCase();
    const currentId = addon?._id ? String(addon._id) : null;

    return addonsCatalog.find((item) => {
      const itemId = item._id ? String(item._id) : null;
      if (currentId && itemId && currentId === itemId) {
        return false;
      }
      const itemIdent = item.identifier || normalizeIdentifier(item.name);
      const itemLower = (item.name || "").trim().toLowerCase();

      if (inputIdent && itemIdent && inputIdent === itemIdent) return true;
      if (itemLower && itemLower === inputLower) return true;
      return false;
    });
  }, [formData.name, addon, addonsCatalog]);

  const isDuplicate = Boolean(duplicateMatch);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    if (!formData.name.trim()) {
      notify("Please provide an addon name", "error");
      return;
    }

    if (isDuplicate) {
      notify("This addon is already included in the catalog.", "error");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        available: formData.available,
      };

      if (formData.price !== "" && !isNaN(Number(formData.price))) {
        payload.price = Math.max(0, Number(formData.price));
        payload.pricing_type = formData.pricing_type || "fixed";
      }

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
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-foreground text-lg">
            {addon ? "Edit Addon" : "Add Addon"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Addon Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-all text-foreground ${
                  isDuplicate
                    ? "border-amber-400 bg-amber-50/20 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    : "border-gray-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                }`}
                placeholder="e.g. Entourage Setup, Extra Chairs"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              {/* Duplicate Warning */}
              {isDuplicate && (
                <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs animate-in fade-in duration-150">
                  <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">
                      This addon is already included in the catalog.
                    </p>
                    <p className="text-[11px] text-amber-700/90 mt-0.5">
                      "{duplicateMatch.name}" already exists. Duplicate addons cannot be added.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Description
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 h-24 resize-none transition-all text-foreground"
                placeholder="Brief description of what this addon or rental includes..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Availability Status Toggle */}
            <div className="p-3.5 rounded-md border border-gray-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Availability Status
                </span>
                <span className="text-xs text-muted-foreground">
                  {formData.available ? "Available for event bookings" : "Unavailable (Disabled for bookings)"}
                </span>
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
            <Btn
              variant={isDuplicate ? "secondary" : "primary"}
              type="submit"
              disabled={loading || isDuplicate}
              className={isDuplicate ? "opacity-60 cursor-not-allowed" : ""}
            >
              {loading
                ? addon
                  ? "Saving..."
                  : "Adding..."
                : isDuplicate
                ? "Already Added"
                : addon
                ? "Save Changes"
                : "Save Addon"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
