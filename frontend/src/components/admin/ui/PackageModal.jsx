import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Pencil, Check } from "lucide-react";
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
    event_type_other: "",
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
  const [activeClassTab, setActiveClassTab] = useState("setup"); // 'setup' | 'dining' | 'addons'

  const [setupInput, setSetupInput] = useState({ name: "", qty: "" });
  const [diningInput, setDiningInput] = useState({ name: "", qty: "" });
  const [addOnInput, setAddOnInput] = useState({
    name: "",
    qty: "",
  });

  // In-line editing states
  const [editingInclusionStr, setEditingInclusionStr] = useState(null);
  const [editInclusionData, setEditInclusionData] = useState({ name: "", qty: "" });

  const [editingAddOnIdx, setEditingAddOnIdx] = useState(null);
  const [editAddOnData, setEditAddOnData] = useState({
    name: "",
    qty: "",
  });

  const [newScaffoldOption, setNewScaffoldOption] = useState({
    label: "",
    width_ft: "",
    length_ft: "",
    guest_min: "",
    guest_max: "",
  });

  // ============ MEDIA STATE ============
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  // Saved gallery URLs the admin marked for deletion — only sent on submit.
  const [galleryToRemove, setGalleryToRemove] = useState([]);

  // ============ EFFECTS ============
  useEffect(() => {
    setGalleryToRemove([]);

    if (pkg) {
      // Normalize add_ons
      const normalizedAddOns = (pkg.add_ons || []).map((a) => ({
        name: a.name || (typeof a === "string" ? a : ""),
        qty: a.qty || "",
      }));

      const existingScaffoldCount = (pkg.scaffold_size_options || []).length;

      setFormData({
        name: pkg.name || "",
        package_type: pkg.package_type || "Event Setup Only",
        event_type: pkg.event_type || "",
        event_type_other: "",
        available: pkg.available !== false,
        guest_min: pkg.guest_min || "",
        guest_max: pkg.guest_max || "",
        setup_price: pkg.setup_price || "",
        description: pkg.description || "",
        fullDescription: pkg.fullDescription || "",
        inclusions: pkg.inclusions || [],
        add_ons: normalizedAddOns,
        setup_equipment: pkg.setup_equipment || [],
        scaffold_size_options: pkg.scaffold_size_options || [],
        default_scaffold_option_id: pkg.default_scaffold_option_id || "",
      });
      setShowScaffoldForm(existingScaffoldCount === 0);
    } else {
      setShowScaffoldForm(true);
    }
  }, [pkg]);

  // ============ INCLUSION HELPERS & CATEGORIZATION ============
  const parseInclusion = (str) => {
    const raw = String(str || "").trim();
    const match = raw.match(/^\s*\[([^\]]+)\]\s*(.+?)\s*(?:\(([^()]*)\))?\s*$/);
    if (!match) {
      return { category: "Event Setup & Furniture", name: raw, qty: "" };
    }
    return {
      category: match[1].trim(),
      name: match[2].trim(),
      qty: match[3]?.trim() || "",
    };
  };

  const isDiningInclusion = (incStr) => {
    const parsed = parseInclusion(incStr);
    const cat = String(parsed.category || "").toLowerCase();
    const name = String(parsed.name || "").toLowerCase();
    if (cat.includes("dining") || cat.includes("tableware") || cat.includes("service")) {
      return true;
    }
    const diningKeywords = [
      "warmer", "plate", "spoon", "glass", "tissue", "planggana",
      "dishwashing", "styrofoam", "cooler", "cubes", "gallon",
      "jug", "crew", "staff", "tulyasi", "tungko", "cutlery", "goblet",
    ];
    return diningKeywords.some((k) => name.includes(k));
  };

  const handleAddSetupInclusion = (customName) => {
    const nameToAdd = customName || setupInput.name;
    if (!nameToAdd.trim()) return;
    const qtyStr = setupInput.qty.trim() ? ` (${setupInput.qty.trim()})` : "";
    const incStr = `[Event Setup & Furniture] ${nameToAdd.trim()}${qtyStr}`;

    setFormData((prev) => ({
      ...prev,
      inclusions: [...prev.inclusions, incStr],
    }));

    setSetupInput({ name: "", qty: "" });
  };

  const handleAddDiningInclusion = (customName) => {
    const nameToAdd = customName || diningInput.name;
    if (!nameToAdd.trim()) return;
    const qtyStr = diningInput.qty.trim() ? ` (${diningInput.qty.trim()})` : "";
    const incStr = `[Dining & Service Inventory] ${nameToAdd.trim()}${qtyStr}`;

    setFormData((prev) => ({
      ...prev,
      inclusions: [...prev.inclusions, incStr],
    }));

    setDiningInput({ name: "", qty: "" });
  };

  const handleRemoveInclusionString = (targetStr) => {
    setFormData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.filter((inc) => inc !== targetStr),
    }));
  };

  const handleStartEditInclusion = (incStr) => {
    const parsed = parseInclusion(incStr);
    setEditingInclusionStr(incStr);
    setEditInclusionData({
      name: parsed.name,
      qty: parsed.qty || "",
    });
  };

  const handleSaveEditInclusion = (category, originalStr) => {
    if (!editInclusionData.name.trim()) return;
    const qtyStr = editInclusionData.qty.trim()
      ? ` (${editInclusionData.qty.trim()})`
      : "";
    const newIncStr = `[${category}] ${editInclusionData.name.trim()}${qtyStr}`;

    setFormData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.map((inc) =>
        inc === originalStr ? newIncStr : inc,
      ),
    }));

    setEditingInclusionStr(null);
    setEditInclusionData({ name: "", qty: "" });
  };

  const handleCancelEditInclusion = () => {
    setEditingInclusionStr(null);
    setEditInclusionData({ name: "", qty: "" });
  };

  // ============ HANDLERS - Add-ons ============
  const handleAddAddOn = (presetName) => {
    const nameToAdd = presetName || addOnInput.name;
    if (!nameToAdd.trim()) return;

    const newAddOnObj = {
      name: nameToAdd.trim(),
      qty: addOnInput.qty.trim() || "",
    };

    setFormData((prev) => ({
      ...prev,
      add_ons: [...prev.add_ons, newAddOnObj],
    }));

    setAddOnInput({
      name: "",
      qty: "",
    });
  };

  const handleRemoveAddOn = (index) => {
    setFormData((prev) => ({
      ...prev,
      add_ons: prev.add_ons.filter((_, i) => i !== index),
    }));
  };

  const handleStartEditAddOn = (idx, addOn) => {
    setEditingAddOnIdx(idx);
    setEditAddOnData({
      name: addOn.name,
      qty: addOn.qty || "",
    });
  };

  const handleSaveEditAddOn = (idx) => {
    if (!editAddOnData.name.trim()) return;
    setFormData((prev) => {
      const nextAddOns = [...prev.add_ons];
      nextAddOns[idx] = {
        name: editAddOnData.name.trim(),
        qty: editAddOnData.qty.trim() || "",
      };
      return { ...prev, add_ons: nextAddOns };
    });
    setEditingAddOnIdx(null);
    setEditAddOnData({ name: "", qty: "" });
  };

  const handleCancelEditAddOn = () => {
    setEditingAddOnIdx(null);
    setEditAddOnData({ name: "", qty: "" });
  };

  // Preset lists based directly on client catalog PDF
  const SETUP_PRESETS = [
    "Stage Setup", "Buffet Setup", "Balloon and Name Backdrop", "Couch",
    "Grass Carpet", "Cake Table", "Giveaway Rack", "Set Cover / Ribbons",
    "Round Tables", "Monoblock Chairs", "Tiffany Chairs", "Industrial Fan",
    "Water Station", "Red Carpet", "Centerpiece", "Dove", "Chandelier",
    "Separate Dining Setup for VIP", "Entourage Setup",
  ];

  const DINING_PRESETS = [
    "Food Warmer", "Serving Spoons", "Plates", "Cutlery Sets", "Glasses",
    "Highball Glass and Goblets", "Tissues", "Planggana", "Dishwashing Liquid",
    "Styrofoam Containers", "Ice Cooler", "Ice Cubes", "Mineral Water Gallon",
    "Water Jug", "Staff / Crew", "Tulyasi", "Tungko",
  ];

  const ADDON_PRESETS = [
    "Standee", "Entourage Setup", "Candy Corner", "Host", "Clown",
    "Cake", "Videoke", "Basic Lights & Sounds", "Pica-Pica Station", "Cake & Wine",
  ];

  const SCAFFOLD_PRESETS = [
    { label: "20x20 Setup", width_ft: 20, length_ft: 20, guest_min: 50, guest_max: 80 },
    { label: "20x40 Setup", width_ft: 20, length_ft: 40, guest_min: 100, guest_max: 150 },
    { label: "40x40 Setup", width_ft: 40, length_ft: 40, guest_min: 150, guest_max: 220 },
    { label: "20x60 Setup", width_ft: 20, length_ft: 60, guest_min: 180, guest_max: 250 },
    { label: "40x60 Setup", width_ft: 40, length_ft: 60, guest_min: 250, guest_max: 350 },
  ];

  const [editingScaffoldIdx, setEditingScaffoldIdx] = useState(null);
  const [showScaffoldForm, setShowScaffoldForm] = useState(true);
  const [editScaffoldData, setEditScaffoldData] = useState({
    label: "",
    width_ft: "",
    length_ft: "",
    guest_min: "",
    guest_max: "",
  });

  // ============ HANDLERS - Scaffold Options ============
  const handleAddScaffoldOption = () => {
    const { label, width_ft, length_ft, guest_min, guest_max } =
      newScaffoldOption;
    if (!width_ft || !length_ft) return;
    const area = Number(width_ft) * Number(length_ft);
    const nextLabel = label || `${Number(width_ft)}x${Number(length_ft)} Scaffold`;
    setFormData((prev) => ({
      ...prev,
      scaffold_size_options: [
        ...(prev.scaffold_size_options || []),
        {
          label: nextLabel,
          width_ft: Number(width_ft),
          length_ft: Number(length_ft),
          area_ft2: area,
          guest_min: guest_min ? Number(guest_min) : undefined,
          guest_max: guest_max ? Number(guest_max) : undefined,
        },
      ],
    }));
    setNewScaffoldOption({
      label: "",
      width_ft: "",
      length_ft: "",
      guest_min: "",
      guest_max: "",
    });
    setShowScaffoldForm(false);
  };

  const handleRemoveScaffoldOption = (index) => {
    setFormData((prev) => {
      const nextOptions = prev.scaffold_size_options.filter((_, i) => i !== index);
      if (nextOptions.length === 0) {
        setShowScaffoldForm(true);
      }
      return { ...prev, scaffold_size_options: nextOptions };
    });
  };

  const handleStartEditScaffold = (idx, opt) => {
    setEditingScaffoldIdx(idx);
    setEditScaffoldData({
      label: opt.label || "",
      width_ft: opt.width_ft || "",
      length_ft: opt.length_ft || "",
      guest_min: opt.guest_min || "",
      guest_max: opt.guest_max || "",
    });
  };

  const handleSaveEditScaffold = (idx) => {
    const { width_ft, length_ft, guest_min, guest_max } = editScaffoldData;
    if (!width_ft || !length_ft) return;
    const area = Number(width_ft) * Number(length_ft);
    const nextLabel = `${Number(width_ft)}x${Number(length_ft)} Scaffold`;

    setFormData((prev) => {
      const nextOptions = [...(prev.scaffold_size_options || [])];
      nextOptions[idx] = {
        ...nextOptions[idx],
        label: nextLabel,
        width_ft: Number(width_ft),
        length_ft: Number(length_ft),
        area_ft2: area,
        guest_min: guest_min ? Number(guest_min) : undefined,
        guest_max: guest_max ? Number(guest_max) : undefined,
      };
      return { ...prev, scaffold_size_options: nextOptions };
    });

    setEditingScaffoldIdx(null);
  };

  const handleCancelEditScaffold = () => {
    setEditingScaffoldIdx(null);
  };

  const handleApplyScaffoldPreset = (preset) => {
    setNewScaffoldOption({
      label: preset.label,
      width_ft: preset.width_ft,
      length_ft: preset.length_ft,
      guest_min: preset.guest_min,
      guest_max: preset.guest_max,
    });
  };

  const handleSetDefaultScaffoldOption = (id) => {
    setFormData((prev) => ({ ...prev, default_scaffold_option_id: id }));
  };

  // Computed inclusion lists partitioned into the 2 inclusion classes
  const setupInclusions = (formData.inclusions || []).filter(
    (inc) => !isDiningInclusion(inc),
  );
  const diningInclusions = (formData.inclusions || []).filter(
    (inc) => isDiningInclusion(inc),
  );

  // ============ HANDLERS - Form Submit ============
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.event_type || !formData.setup_price) {
      notify("Package name, event type, and base setup price are required.", "error");
      return;
    }

    if (formData.event_type === "Other" && !String(formData.event_type_other || "").trim()) {
      notify("Please specify the custom event type.", "error");
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      const normalizedFormData = {
        ...formData,
        event_type:
          formData.event_type === "Other"
            ? String(formData.event_type_other || "").trim() || "Other"
            : formData.event_type,
        scaffold_size_options: (formData.scaffold_size_options || []).map(
          ({ price, ...rest }) => rest,
        ),
      };

      Object.keys(normalizedFormData).forEach((key) => {
        if (key === "inclusions") {
          normalizedFormData[key].forEach((val) => data.append(`${key}[]`, val));
        } else if (key === "setup_equipment" || key === "add_ons") {
          data.append(key, JSON.stringify(normalizedFormData[key]));
        } else if (key === "scaffold_size_options") {
          data.append(key, JSON.stringify(normalizedFormData[key]));
        } else {
          data.append(key, normalizedFormData[key]);
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
                    setFormData({
                      ...formData,
                      event_type: e.target.value,
                      event_type_other:
                        e.target.value === "Other" ? formData.event_type_other : "",
                    })
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
                {formData.event_type === "Other" && (
                  <input
                    type="text"
                    className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="Specify custom event type"
                    value={formData.event_type_other}
                    onChange={(e) =>
                      setFormData({ ...formData, event_type_other: e.target.value })
                    }
                  />
                )}
              </div>

              {/* Base Setup Price */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Base Setup Price (₱) <span className="text-red-400">*</span>
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

          {/* SECTION 2: Scaffold Size & Capacity Options */}
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
              {showScaffoldForm && (
                <div className="flex flex-col gap-2 mb-1">
                  <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-gray-700">Scaffold Size</span>
                    <input
                      type="number"
                      placeholder="Width"
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
                      placeholder="Length"
                      className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                      value={newScaffoldOption.length_ft}
                      onChange={(e) =>
                        setNewScaffoldOption({
                          ...newScaffoldOption,
                          length_ft: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-gray-700">Best for</span>
                    <input
                      type="number"
                      placeholder="Min Guest"
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
                      placeholder="Max Guest"
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
                      disabled={
                        !newScaffoldOption.width_ft ||
                        !newScaffoldOption.length_ft
                      }
                    >
                      <Plus size={12} className="mr-1" /> Confirm
                    </Btn>
                  </div>
                </div>

                {/* Quick Presets Chips */}
                <div className="mt-1">
                  <p className="text-[11px] text-gray-400 font-medium mb-1.5">
                    Quick Autofill Standard Sizes:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SCAFFOLD_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyScaffoldPreset(preset)}
                        className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary transition-all shadow-2xs hover:bg-primary/5 flex items-center gap-1"
                      >
                        <Plus size={10} /> {preset.label}, Fit for ({preset.guest_min}-{preset.guest_max}) Guest
                      </button>
                    ))}
                  </div>
                  </div>
                </div>
              )}

              {/* Scaffold Options List */}
              {(formData.scaffold_size_options || []).length > 0 ? (
                <ul className="space-y-2">
                  {(formData.scaffold_size_options || []).map((opt, idx) => {
                    const isEditing = editingScaffoldIdx === idx;

                    if (isEditing) {
                      return (
                        <li
                          key={idx}
                          className="flex flex-col gap-2 bg-blue-50/70 p-3 rounded-lg border border-blue-200 shadow-2xs"
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-gray-700">Scaffold Size</span>
                              <input
                                type="number"
                                placeholder="Width"
                                className="w-20 border border-blue-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editScaffoldData.width_ft}
                                onChange={(e) =>
                                  setEditScaffoldData({
                                    ...editScaffoldData,
                                    width_ft: e.target.value,
                                  })
                                }
                              />
                              <input
                                type="number"
                                placeholder="Length"
                                className="w-20 border border-blue-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editScaffoldData.length_ft}
                                onChange={(e) =>
                                  setEditScaffoldData({
                                    ...editScaffoldData,
                                    length_ft: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="flex gap-2 items-center flex-wrap justify-between">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-xs text-gray-700">Best for</span>
                                <input
                                  type="number"
                                  placeholder="Min Guest"
                                  className="w-24 border border-blue-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                  value={editScaffoldData.guest_min}
                                  onChange={(e) =>
                                    setEditScaffoldData({
                                      ...editScaffoldData,
                                      guest_min: e.target.value,
                                    })
                                  }
                                />
                                <span className="text-gray-400 text-xs">to</span>
                                <input
                                  type="number"
                                  placeholder="Max Guest"
                                  className="w-24 border border-blue-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                  value={editScaffoldData.guest_max}
                                  onChange={(e) =>
                                    setEditScaffoldData({
                                      ...editScaffoldData,
                                      guest_max: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditScaffold(idx)}
                                  className="px-2.5 py-1 bg-primary text-white text-xs font-semibold rounded hover:bg-primary/90 transition-colors shadow-2xs flex items-center gap-1"
                                >
                                  <Check size={12} /> Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditScaffold}
                                  className="px-2.5 py-1 text-gray-600 bg-gray-200 text-xs rounded hover:bg-gray-300 transition-colors flex items-center gap-1"
                                >
                                  <X size={12} /> Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    }

                    return (
                      <li
                        key={idx}
                        className="flex items-center justify-between bg-white p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors shadow-sm gap-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
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
                            className="accent-primary shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {opt.label ||
                                `${opt.width_ft}ft × ${opt.length_ft}ft`}
                              {!formData.default_scaffold_option_id &&
                                idx === 0 && (
                                  <span className="ml-2 text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                                    Default
                                  </span>
                                )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 space-x-2 flex flex-wrap">
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
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditScaffold(idx, opt)}
                            className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                            title="Edit size option"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveScaffoldOption(idx)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove size option"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 italic text-center py-3 bg-white/50 rounded-lg border border-dashed border-gray-200">
                  No scaffold size options configured
                </p>
              )}
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

          {/* SECTION 3: Package Inclusions & Add-ons (3 Classes based on catalog) */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-foreground">
                  Inclusions & Add-ons
                </h3>
                <p className="text-xs text-gray-500">
                  Configure the 3 package classes shown to customers on the website & inquiries.
                </p>
              </div>
            </div>

            {/* 3-Class Segmented Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl w-full border border-gray-200/80 text-xs font-semibold mb-4 gap-1">
              <button
                type="button"
                onClick={() => setActiveClassTab("setup")}
                className={`flex-1 py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeClassTab === "setup"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>🎪</span>
                <span className="truncate">Event Setup & Furniture</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shrink-0">
                  {setupInclusions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveClassTab("dining")}
                className={`flex-1 py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeClassTab === "dining"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>🍽️</span>
                <span className="truncate">Dining & Service</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shrink-0">
                  {diningInclusions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveClassTab("addons")}
                className={`flex-1 py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeClassTab === "addons"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>✨</span>
                <span className="truncate">ADD ONS</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shrink-0">
                  {(formData.add_ons || []).length}
                </span>
              </button>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
              {/* TAB 1: Event Setup & Furniture */}
              {activeClassTab === "setup" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🎪</span>
                      <label className="font-semibold text-gray-800 text-sm">
                        Event Setup & Furniture Inclusions
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Stage, backdrops, tables, chairs, lighting & venue furniture shown to customers.
                    </p>

                    {/* Add Setup Item Form */}
                    <div className="flex gap-2 mb-3 items-center w-full">
                      <input
                        type="text"
                        placeholder="Item name (e.g. Stage Setup, Round Tables, Couch)"
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={setupInput.name}
                        onChange={(e) =>
                          setSetupInput({ ...setupInput, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSetupInclusion();
                          }
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Qty (e.g. 6, 60)"
                        className="w-24 shrink-0 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={setupInput.qty}
                        onChange={(e) =>
                          setSetupInput({ ...setupInput, qty: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSetupInclusion();
                          }
                        }}
                      />
                      <Btn
                        variant="primary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleAddSetupInclusion()}
                        disabled={!setupInput.name.trim()}
                      >
                        <Plus size={14} className="mr-1" /> Add
                      </Btn>
                    </div>

                    {/* Quick Presets Chips */}
                    <div className="mb-1">
                      <p className="text-[11px] text-gray-400 font-medium mb-1.5">
                        Quick Add Presets from Catalog:
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {SETUP_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddSetupInclusion(preset)}
                            className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary transition-all shadow-2xs hover:bg-primary/5 flex items-center gap-1"
                          >
                            <Plus size={10} /> {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Active List */}
                  {setupInclusions.length > 0 ? (
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {setupInclusions.map((inc, i) => {
                        const parsed = parseInclusion(inc);
                        const isEditing = editingInclusionStr === inc;

                        if (isEditing) {
                          return (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm bg-blue-50/70 p-2 rounded-lg border border-blue-200 shadow-2xs"
                            >
                              <input
                                type="text"
                                className="flex-1 min-w-0 border border-blue-300 rounded-md px-2.5 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editInclusionData.name}
                                onChange={(e) =>
                                  setEditInclusionData({
                                    ...editInclusionData,
                                    name: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditInclusion(
                                      "Event Setup & Furniture",
                                      inc,
                                    );
                                  } else if (e.key === "Escape") {
                                    handleCancelEditInclusion();
                                  }
                                }}
                                autoFocus
                              />
                              <input
                                type="text"
                                placeholder="Qty"
                                className="w-20 shrink-0 border border-blue-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editInclusionData.qty}
                                onChange={(e) =>
                                  setEditInclusionData({
                                    ...editInclusionData,
                                    qty: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditInclusion(
                                      "Event Setup & Furniture",
                                      inc,
                                    );
                                  } else if (e.key === "Escape") {
                                    handleCancelEditInclusion();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveEditInclusion(
                                    "Event Setup & Furniture",
                                    inc,
                                  )
                                }
                                className="p-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-2xs shrink-0"
                                title="Save changes"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditInclusion}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors shrink-0"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li
                            key={i}
                            className="flex justify-between items-center text-sm bg-white px-3 py-2.5 rounded-lg border border-gray-100 shadow-2xs gap-2 hover:border-gray-200 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                              <span className="font-medium text-gray-800 break-words">
                                {parsed.name}
                              </span>
                              {parsed.qty && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                                  × {parsed.qty}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditInclusion(inc)}
                                className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                                title="Edit item"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveInclusionString(inc)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-gray-200">
                      No event setup & furniture items added yet
                    </p>
                  )}
                </div>
              )}

              {/* TAB 2: Dining & Service Inventory */}
              {activeClassTab === "dining" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🍽️</span>
                      <label className="font-semibold text-gray-800 text-sm">
                        Dining & Service Inventory Inclusions
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Food warmers, tableware, cutlery, drinkware, service supplies & crew counts.
                    </p>

                    {/* Add Dining Item Form */}
                    <div className="flex gap-2 mb-3 items-center w-full">
                      <input
                        type="text"
                        placeholder="Item name (e.g. Food Warmer, Plates, Staff / Crew)"
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={diningInput.name}
                        onChange={(e) =>
                          setDiningInput({ ...diningInput, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddDiningInclusion();
                          }
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Qty (e.g. 7, 150, 4-8)"
                        className="w-24 shrink-0 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={diningInput.qty}
                        onChange={(e) =>
                          setDiningInput({ ...diningInput, qty: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddDiningInclusion();
                          }
                        }}
                      />
                      <Btn
                        variant="primary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleAddDiningInclusion()}
                        disabled={!diningInput.name.trim()}
                      >
                        <Plus size={14} className="mr-1" /> Add
                      </Btn>
                    </div>

                    {/* Quick Presets Chips */}
                    <div className="mb-1">
                      <p className="text-[11px] text-gray-400 font-medium mb-1.5">
                        Quick Add Presets from Catalog:
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {DINING_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddDiningInclusion(preset)}
                            className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary transition-all shadow-2xs hover:bg-primary/5 flex items-center gap-1"
                          >
                            <Plus size={10} /> {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Active List */}
                  {diningInclusions.length > 0 ? (
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {diningInclusions.map((inc, i) => {
                        const parsed = parseInclusion(inc);
                        const isEditing = editingInclusionStr === inc;

                        if (isEditing) {
                          return (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm bg-emerald-50/70 p-2 rounded-lg border border-emerald-200 shadow-2xs"
                            >
                              <input
                                type="text"
                                className="flex-1 min-w-0 border border-emerald-300 rounded-md px-2.5 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editInclusionData.name}
                                onChange={(e) =>
                                  setEditInclusionData({
                                    ...editInclusionData,
                                    name: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditInclusion(
                                      "Dining & Service Inventory",
                                      inc,
                                    );
                                  } else if (e.key === "Escape") {
                                    handleCancelEditInclusion();
                                  }
                                }}
                                autoFocus
                              />
                              <input
                                type="text"
                                placeholder="Qty"
                                className="w-20 shrink-0 border border-emerald-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editInclusionData.qty}
                                onChange={(e) =>
                                  setEditInclusionData({
                                    ...editInclusionData,
                                    qty: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditInclusion(
                                      "Dining & Service Inventory",
                                      inc,
                                    );
                                  } else if (e.key === "Escape") {
                                    handleCancelEditInclusion();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveEditInclusion(
                                    "Dining & Service Inventory",
                                    inc,
                                  )
                                }
                                className="p-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-2xs shrink-0"
                                title="Save changes"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditInclusion}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors shrink-0"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li
                            key={i}
                            className="flex justify-between items-center text-sm bg-white px-3 py-2.5 rounded-lg border border-gray-100 shadow-2xs gap-2 hover:border-gray-200 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                              <span className="font-medium text-gray-800 break-words">
                                {parsed.name}
                              </span>
                              {parsed.qty && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                                  × {parsed.qty}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditInclusion(inc)}
                                className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                                title="Edit item"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveInclusionString(inc)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-gray-200">
                      No dining & service inventory items added yet
                    </p>
                  )}
                </div>
              )}

              {/* TAB 3: ADD ONS */}
              {activeClassTab === "addons" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">✨</span>
                      <label className="font-semibold text-gray-800 text-sm">
                        Optional Add-ons (ADDS ON)
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Extra options and entertainment packages customers can select during booking.
                    </p>

                    {/* Add Add-on Form */}
                    <div className="flex gap-2 mb-3 items-center w-full">
                      <input
                        type="text"
                        placeholder="Item name (e.g. Videoke, Host, Clown)"
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={addOnInput.name}
                        onChange={(e) =>
                          setAddOnInput({ ...addOnInput, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddAddOn();
                          }
                        }}
                      />

                      <input
                        type="text"
                        placeholder="Qty (e.g. 1, 5, 2-4)"
                        className="w-24 shrink-0 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={addOnInput.qty}
                        onChange={(e) =>
                          setAddOnInput({ ...addOnInput, qty: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddAddOn();
                          }
                        }}
                      />

                      <Btn
                        variant="primary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleAddAddOn()}
                        disabled={!addOnInput.name.trim()}
                      >
                        <Plus size={14} className="mr-1" /> Add
                      </Btn>
                    </div>

                    {/* Quick Presets Chips */}
                    <div className="mb-1">
                      <p className="text-[11px] text-gray-400 font-medium mb-1.5">
                        Quick Add Presets from Catalog:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {ADDON_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddAddOn(preset)}
                            className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary transition-all shadow-2xs hover:bg-primary/5 flex items-center gap-1"
                          >
                            <Plus size={10} /> {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Active List */}
                  {(formData.add_ons || []).length > 0 ? (
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {formData.add_ons.map((add, i) => {
                        const isEditing = editingAddOnIdx === i;

                        if (isEditing) {
                          return (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm bg-purple-50/70 p-2 rounded-lg border border-purple-200 shadow-2xs"
                            >
                              <input
                                type="text"
                                className="flex-1 min-w-0 border border-purple-300 rounded-md px-2.5 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editAddOnData.name}
                                onChange={(e) =>
                                  setEditAddOnData({
                                    ...editAddOnData,
                                    name: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditAddOn(i);
                                  } else if (e.key === "Escape") {
                                    handleCancelEditAddOn();
                                  }
                                }}
                                autoFocus
                              />
                              <input
                                type="text"
                                placeholder="Qty"
                                className="w-20 shrink-0 border border-purple-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editAddOnData.qty}
                                onChange={(e) =>
                                  setEditAddOnData({
                                    ...editAddOnData,
                                    qty: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditAddOn(i);
                                  } else if (e.key === "Escape") {
                                    handleCancelEditAddOn();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditAddOn(i)}
                                className="p-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-2xs shrink-0"
                                title="Save changes"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditAddOn}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors shrink-0"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li
                            key={i}
                            className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-2xs gap-2 hover:border-gray-200 transition-colors"
                          >
                            <span className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0" />
                              <span className="font-medium text-gray-800 break-words">
                                {add.name}
                              </span>
                              {add.qty && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 shrink-0">
                                  × {add.qty}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditAddOn(i, add)}
                                className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                                title="Edit add-on"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAddOn(i)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove add-on"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-gray-200">
                      No add-ons configured yet
                    </p>
                  )}
                </div>
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
