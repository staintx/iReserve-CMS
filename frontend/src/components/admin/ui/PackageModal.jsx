import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import Btn from "./Btn";
import SingleImageField from "./SingleImageField";
import MultiImageField from "./MultiImageField";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export default function PackageModal({ pkg, onClose, onSave }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);

  // ============ FORM STATE ============
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    package_type: "Event Setup Only",
    event_type: "",
    available: true,

    // Guest & Capacity
    guest_min: "",
    guest_max: "",

    // Pricing
    setup_price: "",

    // Descriptions
    description: "",
    fullDescription: "",

    // Inclusions & Add-ons
    inclusions: [],
    add_ons: [],

    // Setup Equipment (Event Setup packages)
    setup_equipment: [],
    scaffold_size_options: [],
    default_scaffold_option_id: "",
  });

  // ============ LOCAL INPUT STATES ============
  const [inclusionMode, setInclusionMode] = useState("inventory"); // 'inventory' | 'custom'
  const [selectedInvId, setSelectedInvId] = useState("");
  const [selectedInvQty, setSelectedInvQty] = useState("");
  const [customInclusion, setCustomInclusion] = useState({
    category: "Event Setup",
    name: "",
    qty: "",
  });

  const [addOnType, setAddOnType] = useState("service"); // 'service' | 'inventory'
  const [newAddOn, setNewAddOn] = useState({
    name: "",
    price: "",
    pricing_type: "fixed",
    inventory_id: "",
  });

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
  // Saved gallery URLs the admin marked for deletion — only sent on submit.
  const [galleryToRemove, setGalleryToRemove] = useState([]);

  // ============ REFERENCE DATA ============
  const [inventoryList, setInventoryList] = useState([]);

  // ============ EFFECTS ============
  useEffect(() => {
    AdminAPI.getInventory()
      .then((invRes) => {
        setInventoryList(invRes.data || []);
      })
      .catch((err) => {
        console.error("Failed to load inventory for package modal", err);
      });

    setGalleryToRemove([]);

    if (pkg) {
      // Normalize setup_equipment
      const normalizedSetupEquip = (pkg.setup_equipment || []).map((eq) => ({
        inventory_id: eq.inventory_id?._id || eq.inventory_id,
        quantity: Number(eq.quantity || 1),
      }));

      // Normalize add_ons
      const normalizedAddOns = (pkg.add_ons || []).map((a) => ({
        name: a.name || "",
        price: a.price || 0,
        pricing_type: a.pricing_type || "fixed",
        inventory_id: a.inventory_id?._id || a.inventory_id || null,
      }));

      setFormData({
        name: pkg.name || "",
        package_type: pkg.package_type || "Event Setup Only",
        event_type: pkg.event_type || "",
        available: pkg.available !== false,
        guest_min: pkg.guest_min || "",
        guest_max: pkg.guest_max || "",
        setup_price: pkg.setup_price || "",
        description: pkg.description || "",
        fullDescription: pkg.fullDescription || "",
        inclusions: pkg.inclusions || [],
        add_ons: normalizedAddOns,
        setup_equipment: normalizedSetupEquip,
        scaffold_size_options: pkg.scaffold_size_options || [],
        default_scaffold_option_id: pkg.default_scaffold_option_id || "",
      });
    }
  }, [pkg]);

  // ============ HANDLERS - Inclusions & Inventory Equipment ============
  const handleAddInventoryInclusion = () => {
    if (!selectedInvId || !selectedInvQty || Number(selectedInvQty) <= 0) return;
    const invItem = inventoryList.find((i) => i._id === selectedInvId);
    if (!invItem) return;

    const qty = Number(selectedInvQty);
    const incCategory = invItem.category || "Equipment";
    const incString = `[${incCategory}] ${invItem.item_name} (${qty})`;

    setFormData((prev) => {
      // Check if already in setup_equipment
      const existingEquipIndex = prev.setup_equipment.findIndex(
        (eq) => (eq.inventory_id?._id || eq.inventory_id) === invItem._id,
      );

      let updatedEquip = [...prev.setup_equipment];
      if (existingEquipIndex >= 0) {
        updatedEquip[existingEquipIndex] = {
          ...updatedEquip[existingEquipIndex],
          quantity: qty,
        };
      } else {
        updatedEquip.push({
          inventory_id: invItem._id,
          quantity: qty,
        });
      }

      // Add to inclusions string list if not already present
      let updatedInclusions = [...prev.inclusions];
      const existingIncIndex = updatedInclusions.findIndex((s) =>
        s.toLowerCase().includes(invItem.item_name.toLowerCase()),
      );
      if (existingIncIndex >= 0) {
        updatedInclusions[existingIncIndex] = incString;
      } else {
        updatedInclusions.push(incString);
      }

      return {
        ...prev,
        setup_equipment: updatedEquip,
        inclusions: updatedInclusions,
      };
    });

    setSelectedInvId("");
    setSelectedInvQty("");
  };

  const handleAddCustomInclusion = () => {
    if (!customInclusion.name.trim()) return;
    const qtyStr = customInclusion.qty.trim()
      ? ` (${customInclusion.qty.trim()})`
      : "";
    const incStr = `[${customInclusion.category}] ${customInclusion.name.trim()}${qtyStr}`;

    setFormData((prev) => ({
      ...prev,
      inclusions: [...prev.inclusions, incStr],
    }));

    setCustomInclusion({ category: "Event Setup", name: "", qty: "" });
  };

  const handleRemoveInclusion = (index) => {
    const targetInc = formData.inclusions[index];
    setFormData((prev) => {
      const nextInclusions = prev.inclusions.filter((_, i) => i !== index);

      // If this inclusion corresponds to an inventory item in setup_equipment, remove it as well
      let nextSetupEquip = prev.setup_equipment;
      if (targetInc) {
        const matchedItem = inventoryList.find((inv) =>
          targetInc.toLowerCase().includes(inv.item_name.toLowerCase()),
        );
        if (matchedItem) {
          nextSetupEquip = nextSetupEquip.filter(
            (eq) =>
              (eq.inventory_id?._id || eq.inventory_id) !== matchedItem._id,
          );
        }
      }

      return {
        ...prev,
        inclusions: nextInclusions,
        setup_equipment: nextSetupEquip,
      };
    });
  };

  // ============ HANDLERS - Add-ons ============
  const handleAddAddOn = () => {
    if (!newAddOn.name.trim() || newAddOn.price === "") return;
    const newAddOnObj = {
      name: newAddOn.name.trim(),
      price: Number(newAddOn.price) || 0,
      pricing_type: newAddOn.pricing_type || "fixed",
      inventory_id: newAddOn.inventory_id || null,
    };

    setFormData((prev) => ({
      ...prev,
      add_ons: [...prev.add_ons, newAddOnObj],
    }));

    setNewAddOn({
      name: "",
      price: "",
      pricing_type: "fixed",
      inventory_id: "",
    });
  };

  const handleRemoveAddOn = (index) => {
    setFormData((prev) => ({
      ...prev,
      add_ons: prev.add_ons.filter((_, i) => i !== index),
    }));
  };

  // ============ HANDLERS - Scaffold Options ============
  const handleAddScaffoldOption = () => {
    const { label, width_ft, length_ft, price, guest_min, guest_max } =
      newScaffoldOption;
    if (!label || !width_ft || !length_ft) return;
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
          price: Number(price || 0),
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

  // ============ HELPER - Get Inventory Item by Inclusion ============
  const getLinkedInventoryForItem = (incStr) => {
    if (!incStr) return null;
    return inventoryList.find((inv) =>
      incStr.toLowerCase().includes(inv.item_name.toLowerCase()),
    );
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
        } else if (key === "setup_equipment" || key === "add_ons") {
          data.append(key, JSON.stringify(formData[key]));
        } else if (key === "scaffold_size_options") {
          data.append(key, JSON.stringify(formData[key]));
        } else {
          data.append(key, formData[key]);
        }
      });

      // Files arrive already validated and downscaled from the image fields.
      if (imageFile) {
        data.append("image", imageFile);
      }

      galleryFiles.forEach((file) => {
        data.append("gallery", file);
      });

      galleryToRemove.forEach((url) => {
        data.append("gallery_to_remove[]", url);
      });

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
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8">
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
                  placeholder="e.g. Elegant White Wedding Setup"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
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

              {/* Base Setup Price (Optional) */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Base Setup Price (₱) <span className="text-xs text-gray-400">(Optional)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="0 (Or configured per scaffold size)"
                  value={formData.setup_price}
                  onChange={(e) => {
                    if (Number(e.target.value) < 0) return;
                    setFormData({ ...formData, setup_price: e.target.value });
                  }}
                />
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

          {/* SECTION 2: Descriptions */}
          <section>
            <h3 className="font-bold text-foreground mb-4">Descriptions</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Short Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-20"
                  placeholder="Brief summary of the setup package (1-2 sentences)"
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
                  placeholder="Detailed description of what this setup package includes"
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

          {/* SECTION 3: Services, Inclusions & Equipment */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-foreground">
                  Services, Inclusions & Equipment
                </h3>
                <p className="text-xs text-gray-500">
                  Combine physical warehouse inventory (auto-reserved on booking) with custom services & decor themes.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-6">
              {/* Inclusions Form */}
              <div>
                {/* Segmented Mode Selector */}
                <div className="flex bg-gray-200/70 p-1 rounded-lg w-fit mb-3 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setInclusionMode("inventory")}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                      inclusionMode === "inventory"
                        ? "bg-white text-primary shadow-sm font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span>📦</span> Link from Inventory
                  </button>
                  <button
                    type="button"
                    onClick={() => setInclusionMode("custom")}
                    className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                      inclusionMode === "custom"
                        ? "bg-white text-primary shadow-sm font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <span>✨</span> Custom Service / Decor
                  </button>
                </div>

                {/* Mode 1: Inventory Form */}
                {inclusionMode === "inventory" ? (
                  <div className="flex gap-2 mb-3 items-center w-full">
                    <select
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary truncate"
                      value={selectedInvId}
                      onChange={(e) => setSelectedInvId(e.target.value)}
                    >
                      <option value="">Select Item (Tables, Chairs, Warmers, Gallons...)</option>
                      {inventoryList.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.item_name} ({item.category || "General"}) — {item.quantity ?? 0} in stock
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="w-20 shrink-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                      value={selectedInvQty}
                      onChange={(e) => setSelectedInvQty(e.target.value)}
                    />
                    <Btn
                      variant="primary"
                      size="sm"
                      className="shrink-0"
                      onClick={handleAddInventoryInclusion}
                      disabled={!selectedInvId || !selectedInvQty}
                    >
                      <Plus size={14} className="mr-1" /> Add
                    </Btn>
                  </div>
                ) : (
                  /* Mode 2: Custom Service / Decor Form */
                  <div className="flex gap-2 mb-3 items-center w-full">
                    <select
                      className="w-32 shrink-0 border border-gray-200 rounded-lg px-2 text-sm bg-white focus:outline-none focus:border-primary"
                      value={customInclusion.category}
                      onChange={(e) =>
                        setCustomInclusion({
                          ...customInclusion,
                          category: e.target.value,
                        })
                      }
                    >
                      <option value="Event Setup">Event Setup</option>
                      <option value="Dining & Service">Dining & Service</option>
                      <option value="Decorations">Decorations</option>
                      <option value="Staffing & Crew">Staffing & Crew</option>
                      <option value="Services">Services</option>
                    </select>
                    <input
                      type="text"
                      placeholder="e.g. Stage Setup, Buffet Setup, Staff"
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                      value={customInclusion.name}
                      onChange={(e) =>
                        setCustomInclusion({
                          ...customInclusion,
                          name: e.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="Qty / Info"
                      className="w-20 shrink-0 border border-gray-200 rounded-lg px-2 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                      value={customInclusion.qty}
                      onChange={(e) =>
                        setCustomInclusion({
                          ...customInclusion,
                          qty: e.target.value,
                        })
                      }
                    />
                    <Btn
                      variant="primary"
                      size="sm"
                      className="shrink-0"
                      onClick={handleAddCustomInclusion}
                      disabled={!customInclusion.name.trim()}
                    >
                      <Plus size={14} className="mr-1" /> Add
                    </Btn>
                  </div>
                )}

                {/* Inclusions List */}
                {formData.inclusions.length > 0 ? (
                  <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {formData.inclusions.map((inc, i) => {
                      const linkedInv = getLinkedInventoryForItem(inc);
                      const isInventoryLinked = Boolean(linkedInv);

                      return (
                        <li
                          key={i}
                          className="flex justify-between items-center text-sm bg-white px-3 py-2.5 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors shadow-sm gap-2"
                        >
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isInventoryLinked ? "bg-blue-500" : "bg-emerald-500"
                              }`}
                            />
                            <span className="font-medium text-gray-800 break-words">{inc}</span>
                            {isInventoryLinked ? (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1 shrink-0">
                                <span>📦</span> Inventory Linked
                                {linkedInv.quantity !== undefined && (
                                  <span className="text-blue-500 font-normal">
                                    ({linkedInv.quantity} in warehouse)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1 shrink-0">
                                <span>✨</span> Custom Service
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveInclusion(i)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                            title="Remove inclusion"
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-gray-200">
                    No inclusions or equipment added yet
                  </p>
                )}
              </div>

              {/* Add-ons Section */}
              <div className="pt-5 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <label className="font-semibold text-gray-800">
                      Optional Add-ons
                    </label>
                  </div>
                  {/* Addon Type Toggle */}
                  <div className="flex bg-gray-200/70 p-0.5 rounded-md text-[11px] font-medium shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAddOnType("service");
                        setNewAddOn({ ...newAddOn, name: "", inventory_id: "" });
                      }}
                      className={`px-2.5 py-1 rounded transition-all ${
                        addOnType === "service"
                          ? "bg-white text-primary shadow-xs font-semibold"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Service Add-on
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddOnType("inventory");
                        setNewAddOn({ ...newAddOn, name: "", inventory_id: "" });
                      }}
                      className={`px-2.5 py-1 rounded transition-all ${
                        addOnType === "inventory"
                          ? "bg-white text-primary shadow-xs font-semibold"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Equipment Add-on
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3">
                  Extra options customers can choose during booking (e.g. Videoke, Host, Clown, Candy Corner)
                </p>

                {/* Add Add-on Form */}
                <div className="flex gap-2 mb-3 items-center w-full">
                  {addOnType === "inventory" ? (
                    <select
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary truncate"
                      value={newAddOn.inventory_id || ""}
                      onChange={(e) => {
                        const inv = inventoryList.find((i) => i._id === e.target.value);
                        setNewAddOn({
                          ...newAddOn,
                          inventory_id: e.target.value,
                          name: inv ? inv.item_name : newAddOn.name,
                        });
                      }}
                    >
                      <option value="">Select Equipment for Add-on...</option>
                      {inventoryList.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.item_name} ({item.category || "General"}) — {item.quantity ?? 0} in stock
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Add-on name (e.g. Clown, Host)"
                      className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                      value={newAddOn.name}
                      onChange={(e) =>
                        setNewAddOn({ ...newAddOn, name: e.target.value })
                      }
                    />
                  )}

                  <input
                    type="number"
                    min="0"
                    placeholder="Price (₱)"
                    className="w-24 shrink-0 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                    value={newAddOn.price}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, price: e.target.value })
                    }
                  />

                  <select
                    className="w-24 shrink-0 border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white text-gray-700 font-medium focus:outline-none focus:border-primary"
                    value={newAddOn.pricing_type || "fixed"}
                    onChange={(e) =>
                      setNewAddOn({ ...newAddOn, pricing_type: e.target.value })
                    }
                  >
                    <option value="fixed">Fixed</option>
                    <option value="quantity">Qty-Based</option>
                  </select>

                  <Btn
                    variant="primary"
                    size="sm"
                    className="shrink-0"
                    onClick={handleAddAddOn}
                    disabled={!newAddOn.name || newAddOn.price === ""}
                  >
                    <Plus size={14} />
                  </Btn>
                </div>

                {/* Add-ons List */}
                {formData.add_ons.length > 0 ? (
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {formData.add_ons.map((add, i) => (
                      <li
                        key={i}
                        className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm"
                      >
                        <span className="flex items-center gap-2 flex-wrap">
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
                          <span className="font-medium text-gray-800">{add.name}</span>
                          <span className="text-gray-500 font-semibold ml-1">
                            ₱{Number(add.price).toLocaleString()}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                            {add.pricing_type === "quantity" ? "Qty-Based" : "Fixed"}
                          </span>
                          {add.inventory_id && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                              <span>📦</span> Equipment Linked
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAddOn(i)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove add-on"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400 italic text-center py-3 bg-white/50 rounded-lg border border-dashed border-gray-200">
                    No add-ons configured
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 4: Scaffold Size Options */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-foreground">
                  Scaffold Size & Capacity Options
                </h3>
                <p className="text-xs text-gray-500">
                  Pre-defined scaffold dimensions with prices and guest capacity (e.g. 20x20, 20x40, 40x40, 40x60).
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
              {/* Add Scaffold Form */}
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    placeholder="Label (e.g. 20x40 Setup)"
                    className="flex-1 min-w-[140px] border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
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
                    className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
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
                    className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
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
                    className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                    value={newScaffoldOption.price}
                    onChange={(e) =>
                      setNewScaffoldOption({
                        ...newScaffoldOption,
                        price: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <input
                    type="number"
                    placeholder="Min Guests"
                    className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
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
                    className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
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
                    disabled={!newScaffoldOption.label || !newScaffoldOption.width_ft || !newScaffoldOption.length_ft}
                  >
                    <Plus size={12} className="mr-1" /> Add Size
                  </Btn>
                </div>
              </div>

              {/* Scaffold Options List */}
              {(formData.scaffold_size_options || []).length > 0 ? (
                <ul className="space-y-2">
                  {(formData.scaffold_size_options || []).map((opt, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between bg-white p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="default_scaffold"
                          checked={
                            String(formData.default_scaffold_option_id) ===
                              String(opt._id) ||
                            (!formData.default_scaffold_option_id && idx === 0)
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
                              {opt.area_ft2 || opt.width_ft * opt.length_ft} ft²
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
                          type="button"
                          onClick={() => handleRemoveScaffoldOption(idx)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove size option"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 italic text-center py-3 bg-white/50 rounded-lg border border-dashed border-gray-200">
                  No scaffold size options configured
                </p>
              )}
            </div>
          </section>

          {/* SECTION 5: Media Upload */}
          <section>
            <h3 className="font-bold text-foreground mb-4">Media</h3>
            <div className="space-y-6">
              {/* Cover image — 16:9 is how package cards and detail pages crop it */}
              <SingleImageField
                label="Cover image"
                hint="Landscape works best · JPG, PNG, GIF or WEBP · up to 5MB"
                aspect="16 / 9"
                previewWidth="13rem"
                emptyLabel="Add a cover image"
                existingUrl={pkg?.image_url}
                file={imageFile}
                onFileChange={setImageFile}
                disabled={loading}
              />

              <MultiImageField
                label="Gallery photos"
                existing={pkg?.gallery || []}
                removedExisting={galleryToRemove}
                onToggleExisting={(url) =>
                  setGalleryToRemove((prev) =>
                    prev.includes(url)
                      ? prev.filter((u) => u !== url)
                      : [...prev, url],
                  )
                }
                files={galleryFiles}
                onFilesChange={setGalleryFiles}
                maxNew={10}
                disabled={loading}
              />
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
