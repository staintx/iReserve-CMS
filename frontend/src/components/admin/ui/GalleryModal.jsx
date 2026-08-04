import React, { useState, useEffect } from "react";
import { X, Upload } from "lucide-react";
import Btn from "./Btn";
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
          <h2 className="font-bold text-[#111] text-lg">{item ? "Edit Gallery Item" : "Add Gallery Item"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Image Upload */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
            <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setImageFile(e.target.files[0])} />
            <Upload className="text-gray-400 mb-2" size={24} />
            <p className="text-sm font-medium text-gray-700">Upload gallery image</p>
            {imageFile && <p className="text-sm text-emerald-600 font-bold mt-2">{imageFile.name}</p>}
            {!imageFile && item?.image_url && <p className="text-sm text-blue-500 font-medium mt-2">Current image saved</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Title / Caption</label>
            <input 
              type="text" 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]" 
              placeholder="e.g. Elegant Wedding Setup" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Category</label>
            <select 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]" 
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
          <Btn variant="primary" className="bg-[#1D4ED8]" onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : "Save Item"}</Btn>
        </div>
      </div>
    </div>
  );
}
