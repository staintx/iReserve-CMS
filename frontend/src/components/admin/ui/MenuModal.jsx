import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import Btn from "./Btn";
import SingleImageField from "./SingleImageField";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export const PREDEFINED_CATEGORIES = [
  "Appetizer",
  "Soup",
  "Salad",
  "Main Course",
  "Vegetable",
  "Pasta",
  "Rice",
  "Dessert",
  "Beverage",
  "Drinking Water",
];

export default function MenuModal({ item, onClose, onSave }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "Main Course",
    description: "",
    status: "available",
    available: true
  });
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (item) {
      const isCustom = item.category && !PREDEFINED_CATEGORIES.includes(item.category);
      setFormData({
        name: item.name || "",
        category: isCustom ? "Others" : (item.category || "Main Course"),
        description: item.description || "",
        status: item.available === false ? "unavailable" : "available",
        available: item.available !== false
      });
      setIsOtherCategory(Boolean(isCustom));
      setCustomCategory(isCustom ? item.category : "");
    } else {
      setFormData({
        name: "",
        category: "Main Course",
        description: "",
        status: "available",
        available: true
      });
      setIsOtherCategory(false);
      setCustomCategory("");
    }
  }, [item]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedName = formData.name?.trim();
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

    setLoading(true);
    try {
      const data = new FormData();
      data.append("name", trimmedName);
      data.append("category", finalCategory);
      data.append("description", formData.description || "");
      data.append("available", formData.status === "available");
      
      if (imageFile) {
        data.append("image", imageFile);
      }

      if (item && item._id) {
        await AdminAPI.updateMenu(item._id, data);
        notify("Menu item updated successfully", "success");
      } else {
        await AdminAPI.createMenu(data);
        notify("Menu item created successfully", "success");
      }
      onSave();
    } catch (error) {
      notify(error.response?.data?.message || "Failed to save menu item", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-foreground text-lg">{item ? "Edit Food Menu Item" : "Add Food Menu Item"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Dish photo — 3:2 matches the crop used on the menu cards */}
          <SingleImageField
            label="Dish photo"
            aspect="3 / 2"
            previewWidth="11rem"
            emptyLabel="Add a dish photo"
            existingUrl={item?.image_url}
            file={imageFile}
            onFileChange={setImageFile}
            disabled={loading}
          />

          <div>
            <label className="block text-sm text-gray-600 mb-1">Item Name</label>
            <input 
              type="text" 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
              placeholder="e.g. Beef Salpicao" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Category</label>
            <select 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
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

          {isOtherCategory && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Custom Category <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                placeholder="Enter custom category" 
                value={customCategory} 
                onChange={(e) => setCustomCategory(e.target.value)}
                autoFocus
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <textarea 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-20" 
              placeholder="Brief description of the dish..." 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
            >
              <option value="available">Available</option>
              <option value="unavailable">Unavailable (Out of Stock)</option>
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <Btn variant="secondary" onClick={onClose} disabled={loading}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : "Save Item"}</Btn>
        </div>
      </div>
    </div>
  );
}
