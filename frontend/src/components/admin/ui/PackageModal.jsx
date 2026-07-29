import React, { useState, useEffect } from "react";
import { X, Upload, Plus, Trash2 } from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export default function PackageModal({ pkg, onClose, onSave }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    size: "",
    event_type: "",
    package_type: "Food Only",
    guest_max: "",
    description: "",
    price_per_guest: "",
    setup_price: "",
    setup_equipment: [],
    menu_items: [],
    available: true,
    fullDescription: "",
    inclusions: [],
    add_ons: [],
    scaffold_size_options: [],
    default_scaffold_option_id: "",
  });

  const [newInclusion, setNewInclusion] = useState({
    category: "Equipment",
    name: "",
    qty: "",
  });
  const [newAddOn, setNewAddOn] = useState({ name: "", qty: "" });
  const [newSetupEquip, setNewSetupEquip] = useState({
    inventory_id: "",
    quantity: "",
  });
  const [newMenuItem, setNewMenuItem] = useState("");
  const [newScaffoldOption, setNewScaffoldOption] = useState({
    label: "",
    width_ft: "",
    length_ft: "",
    price: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [fullMenuList, setFullMenuList] = useState([]);

  useEffect(() => {
    // Fetch inventory for setup equipment
    AdminAPI.getInventory()
      .then((res) =>
        setInventoryList(
          res.data.filter((i) =>
            ["Equipment", "Furniture", "Decorations", "Tableware"].includes(
              i.category,
            ),
          ),
        ),
      )
      .catch((err) => console.error(err));

    AdminAPI.getMenu()
      .then((res) => setFullMenuList(res.data))
      .catch((err) => console.error(err));

    if (pkg) {
      setFormData({
        name: pkg.name || "",
        size: pkg.size || "",
        event_type: pkg.event_type || "",
        package_type: pkg.package_type || "Food Only",
        guest_max: pkg.guest_max || "",
        description: pkg.description || "",
        price_per_guest: pkg.price_per_guest || "",
        setup_price: pkg.setup_price || "",
        setup_equipment: pkg.setup_equipment || [],
        menu_items: pkg.menu_items || [],
        available: pkg.available !== false,
        fullDescription: pkg.fullDescription || "",
        inclusions: pkg.inclusions || [],
        add_ons: pkg.add_ons || [],
        scaffold_size_options: pkg.scaffold_size_options || [],
        default_scaffold_option_id: pkg.default_scaffold_option_id || "",
      });
    }
  }, [pkg]);

  const handleAddInclusion = () => {
    if (!newInclusion.name) return;
    const qtyStr = newInclusion.qty ? ` (${newInclusion.qty})` : "";
    const incStr = `[${newInclusion.category}] ${newInclusion.name}${qtyStr}`;
    setFormData((prev) => ({
      ...prev,
      inclusions: [...prev.inclusions, incStr],
    }));
    setNewInclusion({ category: "Equipment", name: "", qty: "" });
  };

  const handleAddAddOn = () => {
    if (!newAddOn.name) return;
    const qtyStr = newAddOn.qty ? ` (Qty: ${newAddOn.qty})` : "";
    const addStr = `${newAddOn.name}${qtyStr}`;
    setFormData((prev) => ({ ...prev, add_ons: [...prev.add_ons, addStr] }));
    setNewAddOn({ name: "", qty: "" });
  };

  const handleRemoveInclusion = (index) => {
    setFormData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== index),
    }));
  };

  const handleRemoveAddOn = (index) => {
    setFormData((prev) => ({
      ...prev,
      add_ons: prev.add_ons.filter((_, i) => i !== index),
    }));
  };

  const handleAddSetupEquip = () => {
    if (!newSetupEquip.inventory_id || !newSetupEquip.quantity) return;
    setFormData((prev) => ({
      ...prev,
      setup_equipment: [
        ...prev.setup_equipment,
        {
          inventory_id: newSetupEquip.inventory_id,
          quantity: Number(newSetupEquip.quantity),
        },
      ],
    }));
    setNewSetupEquip({ inventory_id: "", quantity: "" });
  };

  const handleRemoveSetupEquip = (index) => {
    setFormData((prev) => ({
      ...prev,
      setup_equipment: prev.setup_equipment.filter((_, i) => i !== index),
    }));
  };

  const handleAddMenuItem = () => {
    if (!newMenuItem) return;
    if (formData.menu_items.some((m) => (m._id || m) === newMenuItem)) return; // Prevent duplicates
    setFormData((prev) => ({
      ...prev,
      menu_items: [...prev.menu_items, newMenuItem],
    }));
    setNewMenuItem("");
  };

  const handleRemoveMenuItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      menu_items: prev.menu_items.filter((_, i) => i !== index),
    }));
  };

  const handleAddScaffoldOption = () => {
    const { label, width_ft, length_ft, price } = newScaffoldOption;
    if (!label || !width_ft || !length_ft || !price) return;
    const area = Number(width_ft) * Number(length_ft);
    setFormData((prev) => ({
      ...prev,
      scaffold_size_options: [
        ...(prev.scaffold_size_options || []),
        {
          label,
          width_ft: Number(width_ft),
          length_ft: Number(length_ft),
          area_ft2: area,
          price: Number(price),
        },
      ],
    }));
    setNewScaffoldOption({ label: "", width_ft: "", length_ft: "", price: "" });
  };

  const handleRemoveScaffoldOption = (index) => {
    setFormData((prev) => ({
      ...prev,
      scaffold_size_options: prev.scaffold_size_options.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const handleSetDefaultScaffoldOption = (id) => {
    setFormData((prev) => ({ ...prev, default_scaffold_option_id: id }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "inclusions" || key === "add_ons") {
          formData[key].forEach((val) => data.append(`${key}[]`, val));
        } else if (key === "setup_equipment" || key === "menu_items") {
          data.append(key, JSON.stringify(formData[key]));
        } else if (key === "scaffold_size_options") {
          data.append(key, JSON.stringify(formData[key]));
        } else {
          data.append(key, formData[key]);
        }
      });

      if (imageFile) data.append("image", imageFile);
      if (galleryFiles.length > 0) {
        for (let i = 0; i < galleryFiles.length; i++) {
          data.append("gallery", galleryFiles[i]);
        }
      }

      if (pkg && pkg._id) {
        await AdminAPI.updatePackage(pkg._id, data);
        notify("Package updated successfully", "success");
      } else {
        await AdminAPI.createPackage(data);
        notify("Package created successfully", "success");
      }
      onSave();
    } catch (error) {
      notify(
        error.response?.data?.message || "Failed to save package",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#111] text-lg">
            {pkg ? "Edit Package" : "Add New Package"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Basic Info */}
          <div>
            <h3 className="font-bold text-[#111] mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Package Name
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                  placeholder="Birthday Package 1"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Package Size
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                  placeholder="20x70"
                  value={formData.size}
                  onChange={(e) =>
                    setFormData({ ...formData, size: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Event Type
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                  value={formData.event_type}
                  onChange={(e) =>
                    setFormData({ ...formData, event_type: e.target.value })
                  }
                >
                  <option value="">Select Event Type</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Christening">Christening</option>
                  <option value="Anniversary">Anniversary</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Package Type
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                  value={formData.package_type}
                  onChange={(e) =>
                    setFormData({ ...formData, package_type: e.target.value })
                  }
                >
                  <option value="Food Only">Food Only</option>
                  <option value="Event Setup Only">Event Setup Only</option>
                  <option value="Food + Event Setup">Food + Event Setup</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Max Guests
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                  placeholder="150"
                  value={formData.guest_max}
                  onChange={(e) => {
                    if (Number(e.target.value) < 0) return;
                    setFormData({ ...formData, guest_max: e.target.value });
                  }}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">
                  Short Description
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] h-20"
                  placeholder="Perfect for intimate gatherings"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                {formData.package_type === "Food Only" && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Price
                    </label>
                    <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 italic">
                      Price per plate depends on menu selection.
                    </div>
                  </div>
                )}
                {formData.package_type === "Event Setup Only" && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Total Setup Price (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                      placeholder="e.g. 50000"
                      value={formData.setup_price}
                      onChange={(e) => {
                        if (Number(e.target.value) < 0) return;
                        setFormData({
                          ...formData,
                          setup_price: e.target.value,
                        });
                      }}
                    />
                  </div>
                )}
                {formData.package_type === "Food + Event Setup" && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Price (₱) per guest
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37]"
                      placeholder="e.g. 1500"
                      value={formData.price_per_guest}
                      onChange={(e) => {
                        if (Number(e.target.value) < 0) return;
                        setFormData({
                          ...formData,
                          price_per_guest: e.target.value,
                        });
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Setup is included for free.
                    </p>
                  </div>
                )}
              </div>
              <div className="col-span-2 flex items-center justify-between bg-gray-50 border border-gray-100 p-4 rounded-xl">
                <div>
                  <p className="font-semibold text-[#111]">Current Status</p>
                  <p className="text-xs text-gray-500">Package availability</p>
                </div>
                <button
                  onClick={() =>
                    setFormData({ ...formData, available: !formData.available })
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${formData.available ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full absolute transition-all ${formData.available ? "right-1" : "left-1"}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Info */}
          <div>
            <h3 className="font-bold text-[#111] mb-4">Detailed Information</h3>
            <label className="block text-sm text-gray-600 mb-1">
              About This Package
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] h-32"
              value={formData.fullDescription}
              onChange={(e) =>
                setFormData({ ...formData, fullDescription: e.target.value })
              }
            />
          </div>

          {/* Food Menu Selection */}
          {(formData.package_type === "Food Only" ||
            formData.package_type === "Food + Event Setup") && (
            <div>
              <h3 className="font-bold text-[#111] mb-4">
                Food Menu Selection
              </h3>
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Link Menu Items
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Select dishes from your Food Menu to include in this package
                </p>
                <div className="flex gap-2 mb-3">
                  <select
                    className="flex-1 border border-gray-200 rounded-lg px-2 text-sm bg-white"
                    value={newMenuItem}
                    onChange={(e) => setNewMenuItem(e.target.value)}
                  >
                    <option value="">Select Dish...</option>
                    {fullMenuList.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} ({item.category})
                      </option>
                    ))}
                  </select>
                  <Btn variant="primary" size="sm" onClick={handleAddMenuItem}>
                    Add
                  </Btn>
                </div>
                <ul className="space-y-1">
                  {formData.menu_items.map((mId, i) => {
                    const idToFind = typeof mId === "object" ? mId._id : mId;
                    const itemData = fullMenuList.find(
                      (x) => x._id === idToFind,
                    );
                    const dispName = itemData
                      ? itemData.name
                      : mId.name || "Unknown Dish";
                    return (
                      <li
                        key={i}
                        className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded border border-gray-100"
                      >
                        <span>{dispName}</span>
                        <button
                          onClick={() => handleRemoveMenuItem(i)}
                          className="text-red-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Services & Inclusions */}
          <div>
            <h3 className="font-bold text-[#111] mb-4">
              Services, Inclusions and Add-Ons
            </h3>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Services & Inclusions
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Add items with categories and quantities (e.g., Plates, Stage
                  Setup)
                </p>
                <div className="flex gap-2 mb-3">
                  <select
                    className="border border-gray-200 rounded-lg px-2 text-sm bg-white"
                    value={newInclusion.category}
                    onChange={(e) =>
                      setNewInclusion({
                        ...newInclusion,
                        category: e.target.value,
                      })
                    }
                  >
                    <option value="Equipment">Equipment</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Tableware">Tableware</option>
                    <option value="Decorations">Decorations</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Item name"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    value={newInclusion.name}
                    onChange={(e) =>
                      setNewInclusion({ ...newInclusion, name: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Qty"
                    className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    value={newInclusion.qty}
                    onChange={(e) =>
                      setNewInclusion({ ...newInclusion, qty: e.target.value })
                    }
                  />
                  <Btn variant="primary" size="sm" onClick={handleAddInclusion}>
                    Add
                  </Btn>
                </div>
                <ul className="space-y-1">
                  {formData.inclusions.map((inc, i) => (
                    <li
                      key={i}
                      className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded border border-gray-100"
                    >
                      <span>{inc}</span>
                      <button
                        onClick={() => handleRemoveInclusion(i)}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Add-Ons
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Optional items that can be added (e.g., Videoke, Candy Corner)
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Add-on name"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    value={newAddOn.name}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, name: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Qty"
                    className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    value={newAddOn.qty}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, qty: e.target.value })
                    }
                  />
                  <Btn variant="primary" size="sm" onClick={handleAddAddOn}>
                    Add
                  </Btn>
                </div>
                <ul className="space-y-1">
                  {formData.add_ons.map((add, i) => (
                    <li
                      key={i}
                      className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded border border-gray-100"
                    >
                      <span>{add}</span>
                      <button
                        onClick={() => handleRemoveAddOn(i)}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {formData.package_type === "Event Setup Only" && (
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-semibold text-gray-800 mb-1">
                    Event Setup Equipment
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Link equipment directly from your inventory
                  </p>
                  <div className="flex gap-2 mb-3">
                    <select
                      className="flex-1 border border-gray-200 rounded-lg px-2 text-sm bg-white"
                      value={newSetupEquip.inventory_id}
                      onChange={(e) =>
                        setNewSetupEquip({
                          ...newSetupEquip,
                          inventory_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Equipment...</option>
                      {inventoryList.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.item_name} ({item.category})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Qty"
                      className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                      value={newSetupEquip.quantity}
                      onChange={(e) =>
                        setNewSetupEquip({
                          ...newSetupEquip,
                          quantity: e.target.value,
                        })
                      }
                    />
                    <Btn
                      variant="primary"
                      size="sm"
                      onClick={handleAddSetupEquip}
                    >
                      Add
                    </Btn>
                  </div>
                  <ul className="space-y-1">
                    {formData.setup_equipment.map((eq, i) => {
                      // Attempt to populate name from list if id matches (handles newly added ones)
                      const itemData = inventoryList.find(
                        (x) =>
                          x._id === (eq.inventory_id._id || eq.inventory_id),
                      );
                      const dispName = itemData
                        ? itemData.item_name
                        : eq.inventory_id.item_name || "Unknown Item";
                      return (
                        <li
                          key={i}
                          className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded border border-gray-100"
                        >
                          <span>
                            {dispName}{" "}
                            <span className="text-gray-500 text-xs ml-2">
                              x{eq.quantity}
                            </span>
                          </span>
                          <button
                            onClick={() => handleRemoveSetupEquip(i)}
                            className="text-red-400 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-6">
                    <h4 className="font-semibold mb-2">
                      Scaffold Size Options
                    </h4>
                    <p className="text-xs text-gray-500 mb-3">
                      Add pre-defined scaffold sizes with prices for customers
                      to choose during booking.
                    </p>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Label (e.g. Small 20x20)"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={newScaffoldOption.label}
                        onChange={(e) =>
                          setNewScaffoldOption({
                            ...newScaffoldOption,
                            label: e.target.value,
                          })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Width ft"
                        className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={newScaffoldOption.width_ft}
                        onChange={(e) =>
                          setNewScaffoldOption({
                            ...newScaffoldOption,
                            width_ft: e.target.value,
                          })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Length ft"
                        className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={newScaffoldOption.length_ft}
                        onChange={(e) =>
                          setNewScaffoldOption({
                            ...newScaffoldOption,
                            length_ft: e.target.value,
                          })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={newScaffoldOption.price}
                        onChange={(e) =>
                          setNewScaffoldOption({
                            ...newScaffoldOption,
                            price: e.target.value,
                          })
                        }
                      />
                      <Btn
                        variant="primary"
                        size="sm"
                        onClick={handleAddScaffoldOption}
                      >
                        <Plus size={12} /> Add
                      </Btn>
                    </div>

                    <ul className="space-y-2">
                      {(formData.scaffold_size_options || []).map(
                        (opt, idx) => (
                          <li
                            key={idx}
                            className="flex items-center justify-between bg-white p-3 border border-gray-100 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="default_scaffold"
                                checked={
                                  String(
                                    formData.default_scaffold_option_id,
                                  ) === String(opt._id) ||
                                  (!formData.default_scaffold_option_id &&
                                    idx === 0)
                                }
                                onChange={() =>
                                  handleSetDefaultScaffoldOption(
                                    opt._id || opt.id || idx,
                                  )
                                }
                              />
                              <div>
                                <div className="font-medium">
                                  {opt.label ||
                                    `${opt.width_ft}ft × ${opt.length_ft}ft`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {opt.area_ft2 ||
                                    (opt.width_ft && opt.length_ft
                                      ? `${opt.width_ft * opt.length_ft} ft²`
                                      : "—")}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="font-semibold">
                                ₱{Number(opt.price || 0).toLocaleString()}
                              </div>
                              <button
                                onClick={() => handleRemoveScaffoldOption(idx)}
                                className="text-red-400 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Media Upload */}
          <div>
            <h3 className="font-bold text-[#111] mb-4">Media Upload</h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => setImageFile(e.target.files[0])}
                />
                <Upload className="text-gray-400 mb-2" size={24} />
                <p className="text-sm font-medium text-gray-700">
                  Drag and drop or click to upload cover image
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Landscape banner format recommended (PNG, JPG up to 10MB)
                </p>
                {imageFile && (
                  <p className="text-sm text-emerald-600 font-bold mt-2">
                    {imageFile.name}
                  </p>
                )}
                {!imageFile && pkg?.image_url && (
                  <p className="text-sm text-blue-500 font-medium mt-2">
                    Current image saved
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#111] mb-2">
                  Gallery Images
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) =>
                      setGalleryFiles(Array.from(e.target.files))
                    }
                  />
                  <Upload className="text-gray-400 mb-2" size={24} />
                  <p className="text-sm font-medium text-gray-700">
                    Upload gallery images
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Select multiple images to showcase your package
                  </p>
                  {galleryFiles.length > 0 && (
                    <p className="text-sm text-emerald-600 font-bold mt-2">
                      {galleryFiles.length} file(s) selected
                    </p>
                  )}
                  {galleryFiles.length === 0 && pkg?.gallery?.length > 0 && (
                    <p className="text-sm text-blue-500 font-medium mt-2">
                      {pkg.gallery.length} current image(s) saved
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <Btn variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            className="bg-[#1D4ED8]"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : pkg ? "Save Package" : "Add Package"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
