import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export default function InventoryModal({ item, onClose, onSave }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_name: "",
    category: "Equipment",
    quantity: "",
    minStock: "",
    supplier: "",
    status: "available",
    available: true,
    reason: ""
  });

  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || "",
        category: item.category || "Equipment",
        quantity: item.quantity || "",
        minStock: item.minStock || "",
        supplier: item.supplier || "",
        status: item.available === false ? "unavailable" : "available",
        available: item.available !== false
      });
    }
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        minStock: Number(formData.minStock || 0),
        available: formData.status === "available"
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
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#111] text-lg">{item ? "Edit Inventory Item" : "Add Inventory Item"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Item Name</label>
            <input 
              type="text" 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]" 
              placeholder="e.g. Round Table" 
              value={formData.item_name} 
              onChange={e => setFormData({...formData, item_name: e.target.value})} 
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Category</label>
            <select 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]" 
              value={formData.category} 
              onChange={e => setFormData({...formData, category: e.target.value})}
            >
              <option value="Equipment">Equipment</option>
              <option value="Furniture">Furniture</option>
              <option value="Tableware">Tableware</option>
              <option value="Decorations">Decorations</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Total Quantity</label>
              <input 
                type="number" 
                min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]" 
                placeholder="0" 
                value={formData.quantity} 
                onChange={e => setFormData({...formData, quantity: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Minimum Stock</label>
              <input 
                type="number" 
                min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]" 
                placeholder="0" 
                value={formData.minStock} 
                onChange={e => setFormData({...formData, minStock: e.target.value})} 
              />
            </div>
          </div>

          {item && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Reason for change <span className="text-gray-400">(optional, shown in the item's log)</span></label>
              <textarea
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] resize-none"
                placeholder="e.g. Restocked from supplier, damaged units written off..."
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select 
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]" 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
            >
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
              <option value="out_of_stock">Out of Stock</option>
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
