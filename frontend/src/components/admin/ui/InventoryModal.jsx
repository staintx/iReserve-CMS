import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, AlertCircle } from "lucide-react";
import Btn from "./Btn";
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

export default function InventoryModal({ item, onClose, onSave, existingItems = [] }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);
  const [itemsCatalog, setItemsCatalog] = useState(existingItems || []);

  const [formData, setFormData] = useState({
    item_name: "",
    quantity: "",
    available: true,
    reason: ""
  });

  useEffect(() => {
    if (existingItems && existingItems.length > 0) {
      setItemsCatalog(existingItems);
    } else {
      AdminAPI.getInventory()
        .then((res) => setItemsCatalog(res.data || []))
        .catch(() => {});
    }
  }, [existingItems]);

  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || "",
        quantity: item.quantity !== undefined ? item.quantity : "",
        available: item.available !== false,
        reason: ""
      });
    } else {
      setFormData({
        item_name: "",
        quantity: "",
        available: true,
        reason: ""
      });
    }
  }, [item]);

  // Check if the currently entered item already exists in the inventory
  const duplicateMatch = useMemo(() => {
    const trimmedInput = (formData.item_name || "").trim();
    if (!trimmedInput) return null;
    const inputIdent = normalizeIdentifier(trimmedInput);
    const inputLower = trimmedInput.toLowerCase();
    const currentId = item?._id ? String(item._id) : null;

    return itemsCatalog.find((inv) => {
      const invId = inv._id ? String(inv._id) : null;
      // If editing, exclude the current item itself
      if (currentId && invId && currentId === invId) {
        return false;
      }

      const invIdent = inv.identifier || normalizeIdentifier(inv.item_name);
      const invLower = (inv.item_name || "").trim().toLowerCase();

      // Check canonical unique identifier match OR case-insensitive item name match
      if (inputIdent && invIdent && inputIdent === invIdent) return true;
      if (invLower && invLower === inputLower) return true;
      return false;
    });
  }, [formData.item_name, item, itemsCatalog]);

  const isDuplicate = Boolean(duplicateMatch);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    // Guard against rapid duplicate clicks
    if (isSubmittingRef.current || loading) return;

    if (!formData.item_name.trim()) {
      notify("Item name is required", "error");
      return;
    }

    if (isDuplicate) {
      notify("This item is already included in the inventory.", "error");
      return;
    }


    if (formData.quantity === "" || isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      notify("Please enter a valid Total Quantity (0 or greater)", "error");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const payload = {
        item_name: formData.item_name.trim(),
        quantity: Number(formData.quantity),
        available: Boolean(formData.available),
        reason: formData.reason?.trim() || undefined
      };

      if (item && item._id) {
        await AdminAPI.updateInventory(item._id, payload);
        notify("Inventory item updated successfully", "success");
      } else {
        await AdminAPI.createInventory(payload);
        notify("Inventory item created successfully", "success");
      }
      onSave();
    } catch (error) {
      notify(error.response?.data?.message || "Failed to save inventory item", "error");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-foreground text-lg">{item ? "Edit Inventory Item" : "Add Inventory Item"}</h2>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Item Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none transition-all text-foreground ${
                  isDuplicate 
                    ? "border-amber-400 bg-amber-50/20 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" 
                    : "border-gray-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                }`}
                placeholder="e.g. Round Table" 
                value={formData.item_name} 
                onChange={e => setFormData({ ...formData, item_name: e.target.value })} 
              />

              {/* Clear duplicate alert banner */}
              {isDuplicate && (
                <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs animate-in fade-in duration-150">
                  <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800">
                      This item is already included in the inventory.
                    </p>
                    <p className="text-[11px] text-amber-700/90 mt-0.5">
                      "{duplicateMatch.item_name}" already exists. Duplicate items cannot be added.
                    </p>
                  </div>
                </div>
              )}
            </div>


            {/* Total Quantity */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Total Quantity <span className="text-red-500">*</span>
              </label>
              <input 
                type="number" 
                min="0"
                required
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-foreground" 
                placeholder="0" 
                value={formData.quantity} 
                onChange={e => setFormData({ ...formData, quantity: e.target.value })} 
              />
              <p className="text-[11px] text-muted-foreground mt-1">Total physical inventory units owned.</p>
            </div>

            {/* Reason for Change (when editing) */}
            {item && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Reason for change <span className="text-gray-400 font-normal lowercase">(optional log note)</span>
                </label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none transition-all text-foreground"
                  placeholder="e.g. Restocked units, repaired, damaged items retired..."
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
            )}

            {/* Status Toggle Button */}
            <div className="p-3.5 rounded-md border border-gray-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Item Status
                </span>
                <span className="text-xs text-muted-foreground">
                  {formData.available 
                    ? "Available for event bookings" 
                    : "Unavailable / Disabled for bookings"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold ${formData.available ? "text-emerald-600" : "text-slate-400"}`}>
                  {formData.available ? "Available" : "Unavailable"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.available}
                  onClick={() => setFormData({ ...formData, available: !formData.available })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                    formData.available ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      formData.available ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
            <Btn variant="secondary" type="button" onClick={onClose} disabled={loading}>Cancel</Btn>
            <Btn 
              variant={isDuplicate ? "secondary" : "primary"} 
              type="submit" 
              disabled={loading || isDuplicate}
              className={isDuplicate ? "opacity-60 cursor-not-allowed" : ""}
            >
              {loading 
                ? (item ? "Saving..." : "Adding...") 
                : isDuplicate 
                  ? "Already Added" 
                  : (item ? "Save Item" : "Add Item")}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
