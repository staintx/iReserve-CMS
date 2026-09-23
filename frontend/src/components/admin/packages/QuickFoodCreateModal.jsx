import React, { useState, useEffect, useRef } from "react";
import { X, Utensils, AlertCircle } from "lucide-react";
import Btn from "../ui/Btn";
import SingleImageField from "../ui/SingleImageField";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import { DEFAULT_FOOD_CATEGORIES } from "../../../utils/menuCategories";

export const PREDEFINED_CATEGORIES = DEFAULT_FOOD_CATEGORIES;

/**
 * QuickFoodCreateModal
 *
 * An in-place modal allowing the admin to create a missing food menu item
 * on the fly without abandoning or resetting the Special Offer Package Creation form.
 * Matches the layout and interaction patterns of QuickInventoryCreateDrawer.
 */
export default function QuickFoodCreateModal({
  isOpen,
  initialCategory = "",
  initialName = "",
  existingDishes = [],
  onClose,
  onCreateSuccess,
}) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "Main Course",
    description: "",
    status: "available",
  });
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const initCat = initialCategory ? String(initialCategory).trim() : "";
      const isCustom = Boolean(initCat && !PREDEFINED_CATEGORIES.includes(initCat));
      const chosenCat = initCat
        ? isCustom
          ? "Others"
          : initCat
        : "Main Course";

      setFormData({
        name: initialName ? String(initialName).trim() : "",
        category: chosenCat,
        description: "",
        status: "available",
      });
      setIsOtherCategory(isCustom);
      setCustomCategory(isCustom ? initCat : "");
      setImageFile(null);
      isSubmittingRef.current = false;
    }
  }, [isOpen, initialCategory, initialName]);

  if (!isOpen) return null;

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === "Others") {
      setIsOtherCategory(true);
      setFormData((prev) => ({ ...prev, category: "Others" }));
    } else {
      setIsOtherCategory(false);
      setFormData((prev) => ({ ...prev, category: value }));
    }
  };

  const trimmedName = (formData.name || "").trim();
  const isDuplicate = Boolean(
    trimmedName &&
      (existingDishes || []).some(
        (dish) =>
          (typeof dish === "string" ? dish : dish?.name || "")
            .trim()
            .toLowerCase() === trimmedName.toLowerCase()
      )
  );

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    if (!trimmedName) {
      notify("Please enter an item name", "error");
      return;
    }

    const finalCategory = isOtherCategory
      ? customCategory.trim()
      : formData.category;

    if (isOtherCategory && !finalCategory) {
      notify("Please enter a custom category", "error");
      return;
    }

    if (isDuplicate) {
      notify(`"${trimmedName}" already exists in this category.`, "error");
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const data = new FormData();
      data.append("name", trimmedName);
      data.append("category", finalCategory);
      data.append("price", 0);
      data.append("description", formData.description || "");
      data.append("available", formData.status === "available");

      if (imageFile) {
        data.append("image", imageFile);
      }

      const res = await AdminAPI.createMenu(data);
      const createdItem = res.data;
      notify(`"${trimmedName}" created and added to ${finalCategory}.`, "success");

      if (onCreateSuccess) {
        onCreateSuccess(createdItem);
      }
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to create food item.", "error");
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
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Utensils size={18} />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-base">
                Create New Food Item
              </h2>
              <p className="text-[11px] text-gray-500">
                Register this dish in the food menu and immediately add it to your package
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200/70 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Dish photo — 3:2 matches the crop used on menu cards */}
          <SingleImageField
            label="Dish photo"
            aspect="3 / 2"
            previewWidth="11rem"
            emptyLabel="Add a dish photo"
            file={imageFile}
            onFileChange={setImageFile}
            disabled={loading}
          />

          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none transition-all ${
                isDuplicate
                  ? "border-amber-400 bg-amber-50/30 text-amber-900 focus:border-amber-500"
                  : "border-gray-200 focus:border-primary"
              }`}
              placeholder="e.g. Beef Salpicao"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />
            {isDuplicate && (
              <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <span>This item already exists in this category.</span>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
              value={isOtherCategory ? "Others" : formData.category}
              onChange={handleCategoryChange}
            >
              {PREDEFINED_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Custom Category Input */}
          {isOtherCategory && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Custom Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                placeholder="Enter custom category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-20 bg-white"
              placeholder="Brief description of the dish..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Status
            </label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable (Out of Stock)</option>
            </select>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <Btn variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={handleSubmit}
            disabled={loading || !trimmedName}
          >
            {loading ? "Saving..." : "Create & Add Dish"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
