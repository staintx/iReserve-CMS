import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import Btn from "./Btn";
import SingleImageField from "./SingleImageField";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

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
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || "",
        category: item.category || "Main Course",
        description: item.description || "",
        status: item.available === false ? "unavailable" : "available",
        available: item.available !== false
      });
    }
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("category", formData.category);
      data.append("description", formData.description);
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
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              {/* These values feed the customer booking flow's course rules
                  (3 main courses, 1 vegetable, 2 desserts) and the "water is
                  included" note — see frontend/src/lib/menuCategories.js and
                  backend/src/utils/menuCategories.js. Vegetable and Drinking
                  Water were missing, so those courses could not be stocked. */}
              <option value="Appetizer">Appetizer</option>
              <option value="Soup">Soup</option>
              <option value="Salad">Salad</option>
              <option value="Main Course">Main Course</option>
              <option value="Vegetable">Vegetable</option>
              <option value="Pasta">Pasta</option>
              <option value="Rice">Rice</option>
              <option value="Dessert">Dessert</option>
              <option value="Beverage">Beverage</option>
              <option value="Drinking Water">Drinking Water</option>
            </select>
          </div>

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
