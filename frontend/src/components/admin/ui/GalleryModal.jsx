import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import Btn from "./Btn";
import SingleImageField from "./SingleImageField";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export default function GalleryModal({ item, onClose, onSave }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "Weddings"
  });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || "",
        category: item.category || "Weddings"
      });
    }
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      notify("Please add a title.", "error");
      return;
    }
    if (!item && !imageFile) {
      notify("Please upload a photo.", "error");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("category", formData.category);
      if (imageFile) data.append("image", imageFile);

      if (item && item._id) {
        await AdminAPI.updateGallery(item._id, data);
        notify("Gallery item updated successfully", "success");
      } else {
        await AdminAPI.createGallery(data);
        notify("Gallery item created successfully", "success");
      }
      onSave();
    } catch (error) {
      notify(error.response?.data?.message || "Failed to save gallery item", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-foreground text-lg">{item ? "Edit Gallery Item" : "Add Gallery Item"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* The photo is the point of a gallery entry, so it leads the form */}
          <SingleImageField
            label="Photo"
            aspect="4 / 3"
            previewWidth="11rem"
            emptyLabel="Add a gallery photo"
            existingUrl={item?.image_url}
            file={imageFile}
            onFileChange={setImageFile}
            disabled={loading}
          />

          <div>
            <label className="block text-sm text-gray-600 mb-1">Title / Caption</label>
            <input 
              type="text" 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
              placeholder="e.g. Elegant Wedding Setup" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Category</label>
            <select 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary" 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              <option value="Weddings">Weddings</option>
              <option value="Birthday">Birthday</option>
              <option value="Corporate Events">Corporate Events</option>
              <option value="Food Display">Food Display</option>
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
