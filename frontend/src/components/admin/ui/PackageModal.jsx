import React, { useState, useEffect } from "react";
import { X, Upload, Plus, Trash2 } from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

const compressImage = async (file, maxDimension = 1600, quality = 0.85) => {
  if (!file || !file.type?.startsWith("image/") || file.size < 300 * 1024) {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, "") + ".jpg",
            {
              type: "image/jpeg",
              lastModified: Date.now(),
            }
          );
          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
};

export default function PackageModal({ pkg, onClose, onSave }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);

  // ============ FORM STATE ============
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    package_type: "Food Only",
    event_type: "",
    available: true,

    // Guest & Capacity
    guest_min: "",
    guest_max: "",

    // Pricing (conditional based on package_type)
    price_per_guest: "",
    setup_price: "",

    // Descriptions
    description: "",
    fullDescription: "",

    // Menu (Food packages)
    menu_items: [],

    // Inclusions & Add-ons
    inclusions: [],
    add_ons: [],

    // Setup Equipment (Event Setup packages)
    setup_equipment: [],
    scaffold_size_options: [],
    default_scaffold_option_id: "",
  });

  // ============ LOCAL INPUT STATES ============
  const [newInclusion, setNewInclusion] = useState({
    category: "Equipment",
    name: "",
    qty: "",
  });
  const [newAddOn, setNewAddOn] = useState({ name: "", price: "" });
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
    guest_min: "",
    guest_max: "",
  });

  // ============ MEDIA STATE ============
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);

  // ============ REFERENCE DATA ============
  const [inventoryList, setInventoryList] = useState([]);
  const [fullMenuList, setFullMenuList] = useState([]);

  // ============ EFFECTS ============
  useEffect(() => {
    Promise.all([
      AdminAPI.getInventory().catch((err) => {
        console.error(err);
        return { data: [] };
      }),
      AdminAPI.getMenu().catch((err) => {
        console.error(err);
        return { data: [] };
      }),
    ]).then(([invRes, menuRes]) => {
      setInventoryList(
        (invRes.data || []).filter((i) =>
          ["Equipment", "Furniture", "Decorations", "Tableware"].includes(
            i.category,
          ),
        ),
      );
      setFullMenuList(menuRes.data || []);
    });

    if (pkg) {
      setFormData({
        name: pkg.name || "",
        package_type: pkg.package_type || "Food Only",
        event_type: pkg.event_type || "",
        available: pkg.available !== false,
        guest_min: pkg.guest_min || "",
        guest_max: pkg.guest_max || "",
        price_per_guest: pkg.price_per_guest || "",
        setup_price: pkg.setup_price || "",
        description: pkg.description || "",
        fullDescription: pkg.fullDescription || "",
        menu_items: pkg.menu_items || [],
        inclusions: pkg.inclusions || [],
        add_ons: pkg.add_ons || [],
        setup_equipment: pkg.setup_equipment || [],
        scaffold_size_options: pkg.scaffold_size_options || [],
        default_scaffold_option_id: pkg.default_scaffold_option_id || "",
      });
    }
  }, [pkg]);

  // ============ HANDLERS - Inclusions ============
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

  const handleRemoveInclusion = (index) => {
    setFormData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== index),
    }));
  };

  // ============ HANDLERS - Add-ons ============
  const handleAddAddOn = () => {
    if (!newAddOn.name || !newAddOn.price) return;
    const newAddOnObj = {
      name: newAddOn.name,
      price: Number(newAddOn.price)
    };
    setFormData((prev) => ({ ...prev, add_ons: [...prev.add_ons, newAddOnObj] }));
    setNewAddOn({ name: "", price: "" });
  };

  const handleRemoveAddOn = (index) => {
    setFormData((prev) => ({
      ...prev,
      add_ons: prev.add_ons.filter((_, i) => i !== index),
    }));
  };

  // ============ HANDLERS - Setup Equipment ============
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

  // ============ HANDLERS - Menu Items ============
  const handleAddMenuItem = () => {
    if (!newMenuItem) return;
    if (formData.menu_items.some((m) => (m._id || m) === newMenuItem)) return;
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

  // ============ HANDLERS - Scaffold Options ============
  const handleAddScaffoldOption = () => {
    const { label, width_ft, length_ft, price, guest_min, guest_max } =
      newScaffoldOption;
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
          guest_min: guest_min ? Number(guest_min) : undefined,
          guest_max: guest_max ? Number(guest_max) : undefined,
        },
      ],
    }));
    setNewScaffoldOption({
      label: "",
      width_ft: "",
      length_ft: "",
      price: "",
      guest_min: "",
      guest_max: "",
    });
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

  // ============ HANDLERS - Form Submit ============
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "inclusions") {
          formData[key].forEach((val) => data.append(`${key}[]`, val));
        } else if (key === "setup_equipment" || key === "menu_items" || key === "add_ons") {
          data.append(key, JSON.stringify(formData[key]));
        } else if (key === "scaffold_size_options") {
          data.append(key, JSON.stringify(formData[key]));
        } else {
          data.append(key, formData[key]);
        }
      });

      if (imageFile) {
        const compressedMain = await compressImage(imageFile);
        data.append("image", compressedMain);
      }

      if (galleryFiles.length > 0) {
        const compressedGallery = await Promise.all(
          galleryFiles.map((file) => compressImage(file))
        );
        compressedGallery.forEach((file) => {
          data.append("gallery", file);
        });
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

  // ============ HELPER - Get Inventory Name ============
  const getInventoryName = (eq) => {
    const itemData = inventoryList.find(
      (x) => x._id === (eq.inventory_id._id || eq.inventory_id),
    );
    return itemData
      ? itemData.item_name
      : eq.inventory_id.item_name || "Unknown Item";
  };

  // ============ HELPER - Get Menu Item Name ============
  const getMenuItemName = (mId) => {
    const idToFind = typeof mId === "object" ? mId._id : mId;
    const itemData = fullMenuList.find((x) => x._id === idToFind);
    return itemData ? itemData.name : mId.name || "Unknown Dish";
  };

  // ============ RENDER ============
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right overflow-hidden">
        {/* ============ HEADER ============ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-foreground text-lg">
            {pkg ? "Edit Package" : "Add New Package"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* ============ SCROLLABLE CONTENT ============ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* SECTION 1: Package Identity */}
          <section>
            <h3 className="font-bold text-foreground mb-4">Package Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Package Name */}
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">
                  Package Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="Birthday Package 1"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              {/* Package Type */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Package Type <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
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

              {/* Event Type */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Event Type <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
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

              {/* Availability Toggle */}
              <div className="col-span-2 flex items-center justify-between bg-gray-50 border border-gray-100 p-4 rounded-xl">
                <div>
                  <p className="font-semibold text-foreground">
                    Availability Status
                  </p>
                  <p className="text-xs text-gray-500">
                    Toggle to make package visible to customers
                  </p>
                </div>
                <button
                  onClick={() =>
                    setFormData({ ...formData, available: !formData.available })
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${
                    formData.available ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full absolute transition-all ${
                      formData.available ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 2: Guest & Pricing */}
          <section>
            <h3 className="font-bold text-foreground mb-4">
              Guest Capacity & Pricing
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Guest Min (Event Setup Only) - Now moved to scaffold options */}
              {formData.package_type !== "Event Setup Only" && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Minimum Guests
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="e.g. 50"
                    value={formData.guest_min}
                    onChange={(e) =>
                      setFormData({ ...formData, guest_min: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Guest Max */}
              {formData.package_type !== "Event Setup Only" && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Maximum Guests
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="150"
                    value={formData.guest_max}
                    onChange={(e) => {
                      if (Number(e.target.value) < 0) return;
                      setFormData({ ...formData, guest_max: e.target.value });
                    }}
                  />
                </div>
              )}

              {/* Pricing - Conditional */}
              <div className="col-span-2">
                {formData.package_type === "Food Only" && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <label className="block text-sm text-gray-600 mb-1">
                      Pricing Model
                    </label>
                    <p className="text-sm text-blue-700">
                      💡 Price per plate depends on menu selection. Configure
                      individual menu item prices separately.
                    </p>
                  </div>
                )}

                {formData.package_type === "Event Setup Only" && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                    <label className="block text-sm text-gray-600 mb-1">
                      Pricing & Guest Capacity Model
                    </label>
                    <p className="text-sm text-amber-700">
                      💡 Event setup pricing and guest capacity are determined
                      by the scaffold size options you configure below. Each
                      scaffold size can have its own price and guest range.
                    </p>
                  </div>
                )}

                {formData.package_type === "Food + Event Setup" && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Price per Guest (₱){" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
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
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Setup is included for free
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 3: Descriptions */}
          <section>
            <h3 className="font-bold text-foreground mb-4">Descriptions</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Short Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-20"
                  placeholder="Brief summary for package cards (1-2 sentences)"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Full Description
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-32"
                  placeholder="Detailed description of what this package includes"
                  value={formData.fullDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fullDescription: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </section>

          {/* SECTION 4: Menu (Food packages only) */}
          {(formData.package_type === "Food Only" ||
            formData.package_type === "Food + Event Setup") && (
            <section>
              <h3 className="font-bold text-foreground mb-4">Food Menu</h3>
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Selected Menu Items
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Choose dishes from your menu catalog to include in this
                  package
                </p>

                {/* Add Menu Item */}
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
                    <Plus size={12} className="mr-1" /> Add
                  </Btn>
                </div>

                {/* Menu Items List */}
                {formData.menu_items.length > 0 ? (
                  <ul className="space-y-1">
                    {formData.menu_items.map((mId, i) => (
                      <li
                        key={i}
                        className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded border border-gray-100"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                          {getMenuItemName(mId)}
                        </span>
                        <button
                          onClick={() => handleRemoveMenuItem(i)}
                          className="text-red-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic text-center py-4">
                    No menu items added yet
                  </p>
                )}
              </div>
            </section>
          )}

          {/* SECTION 5: Services, Inclusions & Add-ons */}
          <section>
            <h3 className="font-bold text-foreground mb-4">
              Services, Inclusions & Add-ons
            </h3>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-6">
              {/* Inclusions */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📦</span>
                  <label className="font-semibold text-gray-800">
                    Services & Inclusions
                  </label>
                </div>
                <p className="text-xs text-gray-500 mb-3 ml-7">
                  Items included in the base package (e.g., Plates, Stage Setup)
                </p>

                {/* Add Inclusion Form */}
                <div className="flex gap-2 mb-3">
                  <select
                    className="border border-gray-200 rounded-lg px-2 text-sm bg-white w-32"
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
                    <Plus size={12} />
                  </Btn>
                </div>

                {/* Inclusions List */}
                {formData.inclusions.length > 0 ? (
                  <ul className="space-y-1">
                    {formData.inclusions.map((inc, i) => (
                      <li
                        key={i}
                        className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded border border-gray-100"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                          {inc}
                        </span>
                        <button
                          onClick={() => handleRemoveInclusion(i)}
                          className="text-red-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic text-center py-2 ml-7">
                    No inclusions added yet
                  </p>
                )}
              </div>

              {/* Add-ons */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">✨</span>
                  <label className="font-semibold text-gray-800">
                    Optional Add-ons
                  </label>
                </div>
                <p className="text-xs text-gray-500 mb-3 ml-7">
                  Extra items customers can add (e.g., Videoke, Candy Corner)
                </p>

                {/* Add Add-on Form */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Add-on name (e.g. Clown)"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    value={newAddOn.name}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, name: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Price (₱)"
                    className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                    value={newAddOn.price}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, price: e.target.value })
                    }
                  />
                  <Btn variant="primary" size="sm" onClick={handleAddAddOn}>
                    <Plus size={12} />
                  </Btn>
                </div>

                {/* Add-ons List */}
                {formData.add_ons.length > 0 ? (
                  <ul className="space-y-1">
                    {formData.add_ons.map((add, i) => (
                      <li
                        key={i}
                        className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded border border-gray-100"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                          {add.name} <span className="text-gray-500 font-medium ml-1">₱{Number(add.price).toLocaleString()}</span>
                        </span>
                        <button
                          onClick={() => handleRemoveAddOn(i)}
                          className="text-red-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic text-center py-2 ml-7">
                    No add-ons added yet
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 6: Event Setup (Setup packages only) */}
          {formData.package_type === "Event Setup Only" && (
            <section>
              <h3 className="font-bold text-foreground mb-4">
                Event Setup Configuration
              </h3>
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-6">
                {/* Setup Equipment */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🔧</span>
                    <label className="font-semibold text-gray-800">
                      Setup Equipment
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 ml-7">
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
                      className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
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
                      <Plus size={12} />
                    </Btn>
                  </div>

                  {/* Equipment List */}
                  {formData.setup_equipment.length > 0 ? (
                    <ul className="space-y-1">
                      {formData.setup_equipment.map((eq, i) => (
                        <li
                          key={i}
                          className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded border border-gray-100"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                            {getInventoryName(eq)}
                            <span className="text-gray-400 text-xs ml-2">
                              ×{eq.quantity}
                            </span>
                          </span>
                          <button
                            onClick={() => handleRemoveSetupEquip(i)}
                            className="text-red-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-2 ml-7">
                      No equipment added yet
                    </p>
                  )}
                </div>

                {/* Scaffold Size Options */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🏗️</span>
                    <label className="font-semibold text-gray-800">
                      Scaffold Size Options
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 ml-7">
                    Add pre-defined scaffold sizes with prices and guest
                    capacity for customers to choose during booking
                  </p>

                  {/* Add Scaffold Form */}
                  <div className="flex flex-col gap-2 mb-3">
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Label (e.g. Small)"
                        className="flex-1 min-w-[120px] border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
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
                        placeholder="Width (ft)"
                        className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
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
                        placeholder="Length (ft)"
                        className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
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
                        placeholder="Price (₱)"
                        className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={newScaffoldOption.price}
                        onChange={(e) =>
                          setNewScaffoldOption({
                            ...newScaffoldOption,
                            price: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Min Guests"
                        className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={newScaffoldOption.guest_min}
                        onChange={(e) =>
                          setNewScaffoldOption({
                            ...newScaffoldOption,
                            guest_min: e.target.value,
                          })
                        }
                      />
                      <span className="text-gray-400 text-sm">to</span>
                      <input
                        type="number"
                        placeholder="Max Guests"
                        className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={newScaffoldOption.guest_max}
                        onChange={(e) =>
                          setNewScaffoldOption({
                            ...newScaffoldOption,
                            guest_max: e.target.value,
                          })
                        }
                      />
                      <Btn
                        variant="primary"
                        size="sm"
                        onClick={handleAddScaffoldOption}
                      >
                        <Plus size={12} className="mr-1" /> Add
                      </Btn>
                    </div>
                  </div>

                  {/* Scaffold Options List */}
                  {(formData.scaffold_size_options || []).length > 0 ? (
                    <ul className="space-y-2">
                      {(formData.scaffold_size_options || []).map(
                        (opt, idx) => (
                          <li
                            key={idx}
                            className="flex items-center justify-between bg-white p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
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
                                className="accent-primary"
                              />
                              <div>
                                <div className="font-medium text-sm">
                                  {opt.label ||
                                    `${opt.width_ft}ft × ${opt.length_ft}ft`}
                                  {!formData.default_scaffold_option_id &&
                                    idx === 0 && (
                                      <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                                        Default
                                      </span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 space-x-3">
                                  <span>
                                    {opt.width_ft}ft × {opt.length_ft}ft
                                  </span>
                                  <span>·</span>
                                  <span>
                                    {opt.area_ft2 ||
                                      opt.width_ft * opt.length_ft}{" "}
                                    ft²
                                  </span>
                                  {(opt.guest_min || opt.guest_max) && (
                                    <>
                                      <span>·</span>
                                      <span className="text-primary font-medium">
                                        👥 {opt.guest_min || 0} -{" "}
                                        {opt.guest_max || "∞"} guests
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="font-semibold text-sm">
                                ₱{Number(opt.price || 0).toLocaleString()}
                              </div>
                              <button
                                onClick={() => handleRemoveScaffoldOption(idx)}
                                className="text-red-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-4 ml-7">
                      No scaffold options added yet
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* SECTION 7: Media Upload */}
          <section>
            <h3 className="font-bold text-foreground mb-4">Media</h3>
            <div className="space-y-4">
              {/* Cover Image */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
                  Cover Image
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setImageFile(e.target.files[0])}
                  />
                  <Upload className="text-gray-400 mb-2" size={24} />
                  <p className="text-sm font-medium text-gray-700">
                    Drag and drop or click to upload
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Landscape banner recommended (PNG, JPG up to 10MB)
                  </p>
                  {imageFile ? (
                    <p className="text-sm text-emerald-600 font-bold mt-2">
                      ✓ {imageFile.name}
                    </p>
                  ) : pkg?.image_url ? (
                    <p className="text-sm text-blue-500 font-medium mt-2">
                      Current image saved
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Gallery Images */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">
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
                  {galleryFiles.length > 0 ? (
                    <p className="text-sm text-emerald-600 font-bold mt-2">
                      ✓ {galleryFiles.length} file(s) selected
                    </p>
                  ) : pkg?.gallery?.length > 0 ? (
                    <p className="text-sm text-blue-500 font-medium mt-2">
                      {pkg.gallery.length} current image(s) saved
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ============ FOOTER ============ */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <Btn variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : pkg ? "Save Changes" : "Create Package"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
