import React, { useState } from "react";
import { X, Layers } from "lucide-react";
import Btn from "../ui/Btn";
import { DEFAULT_FOOD_CATEGORIES } from "../../../utils/menuCategories";

export default function BulkCategoryModal({
  isOpen,
  onClose,
  selectedCount,
  onConfirm,
  availableCategories = DEFAULT_FOOD_CATEGORIES,
}) {
  const [category, setCategory] = useState(availableCategories[0] || "Main Course");
  const [isCustom, setIsCustom] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalCat = isCustom ? customCategory.trim() : category;
    if (!finalCat) return;

    setSubmitting(true);
    try {
      await onConfirm(finalCat);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-card w-full max-w-md rounded-lg shadow-xl border border-border overflow-hidden animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Change Category</h2>
              <p className="text-[11px] text-muted-foreground">
                Updating {selectedCount} selected {selectedCount === 1 ? "dish" : "dishes"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
              Select Category
            </label>
            <select
              value={isCustom ? "Others" : category}
              onChange={(e) => {
                if (e.target.value === "Others") {
                  setIsCustom(true);
                } else {
                  setIsCustom(false);
                  setCategory(e.target.value);
                }
              }}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="Others">Custom Category...</option>
            </select>
          </div>

          {isCustom && (
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wider">
                Custom Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Signature Specialties"
                required
                autoFocus
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
            </div>
          )}

          <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
            <Btn variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </Btn>
            <Btn variant="primary" size="sm" type="submit" disabled={submitting || (isCustom && !customCategory.trim())}>
              {submitting ? "Updating..." : `Apply to ${selectedCount} Items`}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
