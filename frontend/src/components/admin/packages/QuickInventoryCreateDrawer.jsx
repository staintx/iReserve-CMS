import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, Plus, AlertCircle, Layers, PackagePlus } from "lucide-react";
import Btn from "../ui/Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";


const normalizeIdentifier = (name) => {
  if (!name || typeof name !== "string") return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/**
 * QuickInventoryCreateDrawer
 *
 * An in-place drawer / modal allowing the admin to create a missing inventory item
 * (or add-on) on the fly without abandoning or resetting the Package Creation form.
 *
 * Clearly separates:
 * 1. Total Quantity (system-wide inventory record)
 * 2. Quantity Included in This Package (package-level inclusion allocation)
 */
export default function QuickInventoryCreateDrawer({
  isOpen,
  initialName = "",
  isAddon = false,
  existingItems = [],
  existingAddons = [],
  onClose,
  onCreateSuccess,
}) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const [formData, setFormData] = useState({
    item_name: "",
    total_quantity: "",
    low_stock_threshold: "",
    package_quantity: "1",
    description: "",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        item_name: initialName.trim(),
        total_quantity: "",
        low_stock_threshold: "",
        package_quantity: "1",
        description: "",
      });
    }
  }, [isOpen, initialName, isAddon]);

  // Duplicate match check against catalog
  const duplicateMatch = useMemo(() => {
    const trimmedInput = (formData.item_name || "").trim();
    if (!trimmedInput) return null;
    const inputLower = trimmedInput.toLowerCase();

    if (isAddon) {
      return (existingAddons || []).find((addon) => {
        const name = (addon.name || (typeof addon === "string" ? addon : "")).trim().toLowerCase();
        return name === inputLower;
      });
    }

    const inputIdent = normalizeIdentifier(trimmedInput);
    return (existingItems || []).find((inv) => {
      const invIdent = inv.identifier || normalizeIdentifier(inv.item_name);
      const invLower = (inv.item_name || "").trim().toLowerCase();
      if (inputIdent && invIdent && inputIdent === invIdent) return true;
      if (invLower && invLower === inputLower) return true;
      return false;
    });
  }, [formData.item_name, isAddon, existingItems, existingAddons]);

  const isDuplicate = Boolean(duplicateMatch);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    const trimmedName = formData.item_name.trim();
    if (!trimmedName) {
      notify(isAddon ? "Add-on name is required." : "Item name is required.", "error");
      return;
    }

    if (isDuplicate) {
      notify(
        isAddon
          ? `"${trimmedName}" is already an existing add-on.`
          : `"${trimmedName}" is already recorded in inventory.`,
        "error"
      );
      return;
    }

    if (isAddon) {
      // Addon creation flow
      isSubmittingRef.current = true;
      setLoading(true);
      try {
        const payload = {
          name: trimmedName,
          description: formData.description?.trim() || "",
          available: true,
        };
        const res = await AdminAPI.createAddon(payload);
        const createdAddon = res.data;
        notify(`Add-on "${trimmedName}" created and added to package.`, "success");
        if (onCreateSuccess) {
          onCreateSuccess(createdAddon, formData.package_quantity || "1");
        }
        onClose();
      } catch (err) {
        notify(err.response?.data?.message || "Failed to create add-on.", "error");
      } finally {
        setLoading(false);
        isSubmittingRef.current = false;
      }
      return;
    }


    const totalQtyNum = parseInt(formData.total_quantity, 10);
    if (formData.total_quantity === "" || isNaN(totalQtyNum) || totalQtyNum < 0) {
      notify("Please enter a valid Total Quantity (0 or greater).", "error");
      return;
    }

    if (
      formData.low_stock_threshold === "" ||
      formData.low_stock_threshold === null ||
      formData.low_stock_threshold === undefined
    ) {
      notify("Low Stock Threshold is required.", "error");
      return;
    }

    const thresholdNum = Number(formData.low_stock_threshold);
    if (isNaN(thresholdNum) || !Number.isInteger(thresholdNum) || thresholdNum <= 0) {
      notify("Low Stock Threshold must be a whole number greater than 0.", "error");
      return;
    }

    if (totalQtyNum > 0 && thresholdNum > totalQtyNum) {
      notify("Low Stock Threshold cannot be greater than Total Quantity.", "error");
      return;
    }

    const pkgQtyNum = parseInt(formData.package_quantity, 10);
    if (formData.package_quantity === "" || isNaN(pkgQtyNum) || pkgQtyNum < 1) {
      notify("Quantity Included in This Package must be at least 1.", "error");
      return;
    }

    if (pkgQtyNum > totalQtyNum) {
      notify(
        `Quantity Included in This Package (${pkgQtyNum}) cannot exceed inventory Total Quantity (${totalQtyNum}).`,
        "error"
      );
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const payload = {
        item_name: trimmedName,
        quantity: totalQtyNum,
        low_stock_threshold: thresholdNum,
        lowStockThreshold: thresholdNum,
        available: true,
      };

      const res = await AdminAPI.createInventory(payload);
      const createdItem = res.data;
      notify(`"${trimmedName}" created in inventory and added to package.`, "success");

      if (onCreateSuccess) {
        onCreateSuccess(createdItem, pkgQtyNum);
      }
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to create inventory item.", "error");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <PackagePlus size={18} />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-base">
                {isAddon ? "Create New Add-on" : "Create New Inventory Item"}
              </h2>
              <p className="text-[11px] text-gray-500">
                {isAddon
                  ? "Quickly register an add-on and include it in this package"
                  : "Register this item in inventory and immediately add it to your package"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200/70 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* SECTION 1: INVENTORY RECORD */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase tracking-wider">
              <Layers size={14} className="text-primary" />
              <span>{isAddon ? "1. Add-on Record" : "1. Inventory Item Record (Saved to Inventory)"}</span>
            </div>

            {/* Item Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {isAddon ? "Add-on Name" : "Item Name"} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none transition-all ${
                  isDuplicate
                    ? "border-amber-400 bg-amber-50/30 text-amber-900 focus:border-amber-500"
                    : "border-gray-200 focus:border-primary"
                }`}
                placeholder={isAddon ? "e.g. Dessert Station" : "e.g. White Tiffany Chairs"}
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                autoFocus
              />

              {isDuplicate && (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <AlertCircle size={14} className="text-amber-600 shrink-0" />
                  <span>This item already exists. Please pick it from the search list.</span>
                </div>
              )}
            </div>

            {!isAddon && (
              <>

                {/* Total Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Total Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 200"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary transition-all text-gray-800"
                    value={formData.total_quantity}
                    onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Total quantity of that item currently recorded in inventory.
                  </p>
                </div>

                {/* Low Stock Threshold */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Low Stock Threshold <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 50"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary transition-all text-gray-800"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Notify admin when stock on hand reaches this quantity or below.
                  </p>
                </div>
              </>
            )}

            {isAddon && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of this add-on..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary transition-all text-gray-800 resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* SECTION 2: PACKAGE ALLOCATION */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase tracking-wider">
              <Plus size={14} className="text-emerald-600" />
              <span>2. Package Allocation (This Package Only)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Quantity Included in This Package <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max={!isAddon && formData.total_quantity ? Number(formData.total_quantity) : undefined}
                required
                placeholder="e.g. 100"
                className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none transition-all text-gray-800 ${
                  !isAddon &&
                  formData.total_quantity !== "" &&
                  Number(formData.package_quantity) > Number(formData.total_quantity)
                    ? "border-red-400 focus:border-red-500 text-red-700 bg-red-50/20"
                    : "border-gray-200 focus:border-primary"
                }`}
                value={formData.package_quantity}
                onChange={(e) => setFormData({ ...formData, package_quantity: e.target.value })}
              />
              <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-gray-500">
                <span>
                  Quantity assigned/included in this specific package.
                </span>
                <span className="text-emerald-700 font-medium">
                  Note: This value remains package-level data and will not alter or deduct from the inventory Total Quantity.
                </span>
                {!isAddon &&
                  formData.total_quantity !== "" &&
                  Number(formData.package_quantity) > Number(formData.total_quantity) && (
                    <span className="text-red-600 font-semibold mt-1">
                      Quantity Included in This Package cannot exceed Total Quantity ({formData.total_quantity}).
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <Btn
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={
                loading ||
                isDuplicate ||
                !formData.item_name.trim() ||
                (!isAddon &&
                  (formData.total_quantity === "" ||
                    formData.low_stock_threshold === "" ||
                    Number(formData.package_quantity) > Number(formData.total_quantity)))
              }
            >
              <Plus size={15} className="mr-1.5" />
              Create & Add to Package
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
