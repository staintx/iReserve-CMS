import React, { useState, useEffect } from "react";
import Modal from "../../common/Modal";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import {
  Calculator,
  Save,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Plus,
  Trash2,
  Package,
  Utensils,
  Sparkles,
  Truck,
  Percent,
  CreditCard,
  FileText,
  User,
  Check,
  Tag
} from "lucide-react";
import { diffQuotationVersions } from "../../../utils/quotationDiff";

export default function QuotationBuilderModal({ inquiry, onClose, onSuccess }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quotation, setQuotation] = useState(null);

  // Reference Catalogs
  const [catalogMenuItems, setCatalogMenuItems] = useState([]);
  const [catalogAddons, setCatalogAddons] = useState([]);
  const [selectedCatalogDish, setSelectedCatalogDish] = useState("");
  const [selectedCatalogAddon, setSelectedCatalogAddon] = useState("");

  // Customer & Event Snapshot State
  const [guestCount, setGuestCount] = useState(1);

  // Package State
  const [packageName, setPackageName] = useState("");
  const [packagePrice, setPackagePrice] = useState(0);
  const [packageInclusions, setPackageInclusions] = useState([]);

  // Menu & Addons State
  const [menuItems, setMenuItems] = useState([]);
  const [addOns, setAddOns] = useState([]);

  // Fees & Adjustments State
  const [transportationFee, setTransportationFee] = useState(0);
  const [equipmentFee, setEquipmentFee] = useState(0);
  const [decorationFee, setDecorationFee] = useState(0);
  const [taxes, setTaxes] = useState(0);
  const [discounts, setDiscounts] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [adminNotes, setAdminNotes] = useState("");

  // Service Type Conditions
  const eventTypeStr = inquiry?.event_type?.toLowerCase() || "";
  const isFoodOnly = eventTypeStr.includes("food delivery") || eventTypeStr === "food only";
  const isSetupOnly = eventTypeStr.includes("setup only");

  // Load Reference Catalogs & Quotation Data
  useEffect(() => {
    Promise.all([
      AdminAPI.getMenuItems().catch(() => ({ data: [] })),
      AdminAPI.getAddons().catch(() => ({ data: [] })),
      AdminAPI.getQuotationsByInquiry(inquiry._id).catch(() => ({ data: [] }))
    ])
      .then(([menuRes, addonRes, quoteRes]) => {
        setCatalogMenuItems(menuRes.data || []);
        setCatalogAddons(addonRes.data || []);

        const quotes = quoteRes.data;
        if (quotes && quotes.length > 0) {
          // Load latest quotation values
          const latest = quotes[0];
          setQuotation(latest);
          setGuestCount(latest.guest_count || inquiry.guest_count || 1);
          setPackageName(latest.package_name || inquiry.package_id?.name || "Custom Package");
          setPackagePrice(latest.package_price ?? inquiry.package_id?.setup_price ?? inquiry.package_id?.price_per_guest ?? 0);
          setPackageInclusions(latest.package_inclusions || inquiry.package_id?.inclusions || []);
          setMenuItems(latest.menu_items || []);
          setAddOns(latest.add_ons || []);
          setTransportationFee(latest.transportation_fee || 0);
          setEquipmentFee(latest.equipment_fee || 0);
          setDecorationFee(latest.decoration_fee || 0);
          setTaxes(latest.taxes || 0);
          setDiscounts(latest.discounts || 0);
          setAdminNotes(latest.admin_notes || "");
          setDepositAmount(latest.deposit_amount || 0);
        } else {
          // Initialize from Inquiry / Package defaults
          setGuestCount(inquiry.guest_count || 1);
          setPackageName(inquiry.package_id?.name || "Custom Package");
          setPackagePrice(inquiry.package_id?.setup_price ?? inquiry.package_id?.price_per_guest ?? 0);
          setPackageInclusions(inquiry.package_id?.inclusions || []);

          if (inquiry.selected_menu) {
            setMenuItems(inquiry.selected_menu.map(m => ({ name: m.name || "", price: m.price || 0, note: m.category || "" })));
          }
          if (inquiry.service_items) {
            setAddOns(inquiry.service_items.map(s => ({
              name: s.name || "",
              price: s.price || 0,
              quantity: s.quantity || 1,
              pricing_type: s.pricing_type || (s.quantity === 1 ? "fixed" : "quantity")
            })));
          }
        }
      })
      .catch((err) => {
        notify("Failed to load quotation details", "error");
      })
      .finally(() => setLoading(false));
  }, [inquiry]);

  // Non-negative Helper & Input Rules
  const handleNonNegativeKeyDown = (e) => {
    if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
      e.preventDefault();
    }
  };

  const sanitizeNonNegative = (val) => {
    if (val === "" || val === null || val === undefined) return 0;
    const cleanStr = String(val).replace(/-/g, "").replace(/e/gi, "");
    const num = Number(cleanStr);
    return isNaN(num) ? 0 : Math.max(0, num);
  };

  const cleanNum = (val) => {
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  // Handlers - Guest Count
  const handleGuestCountChange = (val) => {
    const sanitized = Math.max(1, sanitizeNonNegative(val));
    setGuestCount(sanitized);
  };

  // Handlers - Package Inclusions
  const handleAddInclusion = () => {
    setPackageInclusions((prev) => [...prev, ""]);
  };

  const handleInclusionChange = (idx, text) => {
    setPackageInclusions((prev) => {
      const copy = [...prev];
      copy[idx] = text;
      return copy;
    });
  };

  const handleRemoveInclusion = (idx) => {
    setPackageInclusions((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handlers - Menu Items
  const handleAddCatalogDish = () => {
    if (!selectedCatalogDish) return;
    const found = catalogMenuItems.find((m) => m._id === selectedCatalogDish);
    if (found) {
      setMenuItems((prev) => [
        ...prev,
        { name: found.name, price: found.price || 0, note: found.category || "" }
      ]);
      setSelectedCatalogDish("");
    }
  };

  const handleAddCustomDish = () => {
    setMenuItems((prev) => [...prev, { name: "", price: 0, note: "" }]);
  };

  const handleMenuChange = (index, field, value) => {
    setMenuItems((prev) => {
      const copy = [...prev];
      const val = field === "price" ? sanitizeNonNegative(value) : value;
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveMenuItem = (index) => {
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers - Add-ons
  const handleAddCatalogAddon = () => {
    if (!selectedCatalogAddon) return;
    const found = catalogAddons.find((a) => a._id === selectedCatalogAddon);
    if (found) {
      setAddOns((prev) => [
        ...prev,
        {
          name: found.name,
          price: found.price || 0,
          quantity: 1,
          pricing_type: found.pricing_type || "fixed"
        }
      ]);
      setSelectedCatalogAddon("");
    }
  };

  const handleAddCustomAddon = () => {
    setAddOns((prev) => [
      ...prev,
      { name: "", price: 0, quantity: 1, pricing_type: "fixed" }
    ]);
  };

  const handleAddOnChange = (index, field, value) => {
    setAddOns((prev) => {
      const copy = [...prev];
      let val = value;
      if (field === "price") {
        val = sanitizeNonNegative(value);
      } else if (field === "quantity") {
        val = Math.max(1, sanitizeNonNegative(value));
      } else if (field === "pricing_type" && value === "fixed") {
        copy[index].quantity = 1;
      }
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveAddOn = (index) => {
    setAddOns((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const menuSubtotal = menuItems.reduce(
    (acc, item) => acc + cleanNum(item.price) * guestCount,
    0
  );

  const addOnsSubtotal = addOns.reduce(
    (acc, item) =>
      acc +
      cleanNum(item.price) *
        (item.pricing_type === "fixed" ? 1 : Math.max(1, cleanNum(item.quantity))),
    0
  );

  const additionalFees =
    cleanNum(transportationFee) +
    cleanNum(equipmentFee) +
    cleanNum(decorationFee);

  const subtotal =
    cleanNum(packagePrice) + menuSubtotal + addOnsSubtotal + additionalFees;

  const totalCost = Math.max(
    0,
    subtotal + cleanNum(taxes) - cleanNum(discounts)
  );

  const depositVal = Math.min(totalCost, cleanNum(depositAmount));
  const remainingBalance = Math.max(0, totalCost - depositVal);

  // Version Comparison Draft
  const draft = {
    inquiry_id: inquiry._id,
    package_id: inquiry.package_id?._id,
    package_name: packageName || "Custom Package",
    package_price: cleanNum(packagePrice),
    package_inclusions: packageInclusions.filter((inc) => inc.trim() !== ""),
    guest_count: guestCount,
    menu_items: menuItems.map((m) => ({ ...m, price: cleanNum(m.price) })),
    add_ons: addOns.map((a) => ({
      ...a,
      price: cleanNum(a.price),
      quantity: a.pricing_type === "fixed" ? 1 : Math.max(1, cleanNum(a.quantity)),
      pricing_type: a.pricing_type || "fixed"
    })),
    transportation_fee: cleanNum(transportationFee),
    equipment_fee: cleanNum(equipmentFee),
    decoration_fee: cleanNum(decorationFee),
    taxes: cleanNum(taxes),
    discounts: cleanNum(discounts),
    subtotal,
    total_cost: totalCost,
    deposit_amount: depositVal,
    remaining_balance: remainingBalance,
    admin_notes: adminNotes
  };

  const pendingChanges = quotation ? diffQuotationVersions(quotation, draft) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      Number(packagePrice) < 0 ||
      Number(transportationFee) < 0 ||
      Number(equipmentFee) < 0 ||
      Number(decorationFee) < 0 ||
      Number(taxes) < 0 ||
      Number(discounts) < 0 ||
      Number(depositAmount) < 0
    ) {
      notify("Prices, fees, taxes, discounts, and deposit amounts cannot be negative.", "error");
      return;
    }

    if (menuItems.some((item) => Number(item.price) < 0)) {
      notify("Menu item prices cannot be negative.", "error");
      return;
    }

    if (addOns.some((item) => Number(item.price) < 0 || Number(item.quantity) < 0)) {
      notify("Add-on prices and quantities cannot be negative.", "error");
      return;
    }

    setSubmitting(true);

    try {
      await AdminAPI.createQuotation(draft);
      notify("Quotation generated successfully!", "success");
      onSuccess();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to generate quotation.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (val) => "₱" + Number(val || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });

  if (loading) {
    return (
      <Modal title="Quotation Builder" onClose={onClose} className="max-w-4xl h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </Modal>
    );
  }

  return (
    <Modal title="Quotation Builder" onClose={onClose} className="max-w-7xl w-[96vw] h-[90vh]">
      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        
        {/* Left Side: Form Controls (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-12">
          {quotation && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3.5 rounded-xl flex items-center gap-2.5 text-sm font-medium">
              <AlertCircle size={18} className="text-blue-600 shrink-0" />
              <div>
                Editing existing Quotation. Saving will publish <strong className="font-semibold">Version {quotation.version_number + 1}.0</strong> to the customer.
              </div>
            </div>
          )}

          {/* SECTION 1: Customer & Event Details */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <User size={18} className="text-primary" /> Customer &amp; Event Snapshot
              </h3>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                Reference
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Customer</span>
                <span className="font-semibold text-slate-800">
                  {inquiry.customer_id?.first_name ? `${inquiry.customer_id.first_name} ${inquiry.customer_id.last_name || ""}` : inquiry.contact_first_name ? `${inquiry.contact_first_name} ${inquiry.contact_last_name || ""}` : "Guest Customer"}
                </span>
                <span className="block text-xs text-slate-500">{inquiry.contact_email || inquiry.customer_id?.email || "—"}</span>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Event Type &amp; Date</span>
                <span className="font-semibold text-slate-800">{inquiry.event_type || "Event"}</span>
                <span className="block text-xs text-slate-500">
                  {inquiry.event_date ? new Date(inquiry.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                  {inquiry.start_time ? ` at ${inquiry.start_time}` : ""}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Guest Count (Pax) *
                </label>
                <input
                  type="number"
                  min="1"
                  onKeyDown={handleNonNegativeKeyDown}
                  value={guestCount}
                  onChange={(e) => handleGuestCountChange(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">Updates menu totals automatically</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Package Details & Inclusions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Package size={18} className="text-primary" /> Package Details
              </h3>
              <span className="text-xs text-slate-400">Customizable for this quotation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Package Name</label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="e.g. Standard Wedding Package"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>

              {!isFoodOnly && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Base Package Price (₱)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">₱</span>
                    <input
                      type="number"
                      min="0"
                      onKeyDown={handleNonNegativeKeyDown}
                      value={packagePrice}
                      onChange={(e) => setPackagePrice(sanitizeNonNegative(e.target.value))}
                      className="w-full pl-7 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Package Inclusions List */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-600 uppercase">Package Inclusions</label>
                <button
                  type="button"
                  onClick={handleAddInclusion}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <Plus size={13} /> Add Inclusion
                </button>
              </div>

              {packageInclusions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No custom inclusions listed.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {packageInclusions.map((inclusion, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <input
                        type="text"
                        value={inclusion}
                        onChange={(e) => handleInclusionChange(idx, e.target.value)}
                        placeholder="Inclusion item description"
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-slate-50/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveInclusion(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove inclusion"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: Menu Items Selection & Customization */}
          {!isSetupOnly && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Utensils size={18} className="text-primary" /> Menu Items Selection
                  </h3>
                  <p className="text-xs text-slate-500">Add from catalog or create custom dishes per pax</p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                  {guestCount} Pax Guest Count
                </span>
              </div>

              {/* Add from Catalog / Custom controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <select
                  value={selectedCatalogDish}
                  onChange={(e) => setSelectedCatalogDish(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Pick dish from Menu Catalog --</option>
                  {catalogMenuItems.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name} ({item.category || "Dish"}) — ₱{item.price || 0}/pax
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCatalogDish}
                  disabled={!selectedCatalogDish}
                  className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-all disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Plus size={13} /> Add Catalog Item
                </button>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <button
                  type="button"
                  onClick={handleAddCustomDish}
                  className="px-3 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-1"
                >
                  <Plus size={13} /> Add Custom Dish
                </button>
              </div>

              {/* Menu Items List */}
              {menuItems.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No menu items added. Pick from catalog or add a custom dish above.</p>
              ) : (
                <div className="space-y-3">
                  {menuItems.map((item, idx) => {
                    const itemSubtotal = cleanNum(item.price) * guestCount;
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-all">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleMenuChange(idx, "name", e.target.value)}
                            placeholder="Dish name"
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <input
                            type="text"
                            value={item.note || ""}
                            onChange={(e) => handleMenuChange(idx, "note", e.target.value)}
                            placeholder="Note / Category (optional)"
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 text-xs">₱</span>
                            <input
                              type="number"
                              min="0"
                              onKeyDown={handleNonNegativeKeyDown}
                              value={item.price}
                              onChange={(e) => handleMenuChange(idx, "price", e.target.value)}
                              className="w-28 pl-6 pr-2.5 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="Price / pax"
                            />
                            <span className="text-[10px] text-slate-400 absolute right-2 -bottom-4">per pax</span>
                          </div>

                          <div className="text-right min-w-[110px]">
                            <span className="text-xs text-slate-400 block font-normal">Subtotal ({guestCount}x)</span>
                            <span className="text-xs font-bold text-slate-800">{fmt(itemSubtotal)}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveMenuItem(idx)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            title="Remove dish"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: Add-ons & Services Selection */}
          {!isFoodOnly && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                    <Sparkles size={18} className="text-primary" /> Add-ons &amp; Services
                  </h3>
                  <p className="text-xs text-slate-500">Supports fixed services (e.g. Entourage Setup) and quantity-based items</p>
                </div>
              </div>

              {/* Add from Catalog / Custom controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <select
                  value={selectedCatalogAddon}
                  onChange={(e) => setSelectedCatalogAddon(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Pick add-on from Global Catalog --</option>
                  {catalogAddons.map((addon) => (
                    <option key={addon._id} value={addon._id}>
                      {addon.name} ({addon.pricing_type === "quantity" ? "Qty-Based" : "Fixed"}) — ₱{addon.price || 0}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddCatalogAddon}
                  disabled={!selectedCatalogAddon}
                  className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-all disabled:opacity-40 flex items-center justify-center gap-1"
                >
                  <Plus size={13} /> Add Catalog Service
                </button>
                <span className="text-slate-300 hidden sm:inline">|</span>
                <button
                  type="button"
                  onClick={handleAddCustomAddon}
                  className="px-3 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-1"
                >
                  <Plus size={13} /> Add Custom Service
                </button>
              </div>

              {/* Add-ons List */}
              {addOns.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No add-ons added. Pick from catalog or add a custom service above.</p>
              ) : (
                <div className="space-y-3">
                  {addOns.map((item, idx) => {
                    const isFixed = item.pricing_type === "fixed";
                    const itemQty = isFixed ? 1 : Math.max(1, cleanNum(item.quantity));
                    const itemSubtotal = cleanNum(item.price) * itemQty;
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-all">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleAddOnChange(idx, "name", e.target.value)}
                            placeholder="Add-on / Service Name"
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <select
                            value={item.pricing_type || "fixed"}
                            onChange={(e) => handleAddOnChange(idx, "pricing_type", e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="fixed">Fixed / One-Time Service</option>
                            <option value="quantity">Quantity-Based Pricing</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          {isFixed ? (
                            <span className="px-2.5 py-2 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                              Fixed (1x)
                            </span>
                          ) : (
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400 text-xs">x</span>
                              <input
                                type="number"
                                min="1"
                                onKeyDown={handleNonNegativeKeyDown}
                                value={item.quantity}
                                onChange={(e) => handleAddOnChange(idx, "quantity", e.target.value)}
                                className="w-20 pl-5 pr-2 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="Qty"
                              />
                            </div>
                          )}

                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 text-xs">₱</span>
                            <input
                              type="number"
                              min="0"
                              onKeyDown={handleNonNegativeKeyDown}
                              value={item.price}
                              onChange={(e) => handleAddOnChange(idx, "price", e.target.value)}
                              className="w-28 pl-6 pr-2.5 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                              placeholder="Unit Price"
                            />
                          </div>

                          <div className="text-right min-w-[90px]">
                            <span className="text-xs text-slate-400 block font-normal">Subtotal</span>
                            <span className="text-xs font-bold text-slate-800">{fmt(itemSubtotal)}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveAddOn(idx)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            title="Remove add-on"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: Additional Fees & Logistics */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <Truck size={18} className="text-primary" /> Logistics &amp; Additional Fees
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Transportation Fee (₱)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">₱</span>
                  <input
                    type="number"
                    min="0"
                    onKeyDown={handleNonNegativeKeyDown}
                    value={transportationFee}
                    onChange={(e) => setTransportationFee(sanitizeNonNegative(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              {!isFoodOnly && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Equipment Fee (₱)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">₱</span>
                      <input
                        type="number"
                        min="0"
                        onKeyDown={handleNonNegativeKeyDown}
                        value={equipmentFee}
                        onChange={(e) => setEquipmentFee(sanitizeNonNegative(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Decoration Fee (₱)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">₱</span>
                      <input
                        type="number"
                        min="0"
                        onKeyDown={handleNonNegativeKeyDown}
                        value={decorationFee}
                        onChange={(e) => setDecorationFee(sanitizeNonNegative(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SECTION 6: Adjustments & Payment Terms */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
              <Percent size={18} className="text-primary" /> Adjustments &amp; Payment Terms
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Taxes (₱)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">₱</span>
                  <input
                    type="number"
                    min="0"
                    onKeyDown={handleNonNegativeKeyDown}
                    value={taxes}
                    onChange={(e) => setTaxes(sanitizeNonNegative(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Discounts (₱)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">₱</span>
                  <input
                    type="number"
                    min="0"
                    onKeyDown={handleNonNegativeKeyDown}
                    value={discounts}
                    onChange={(e) => setDiscounts(sanitizeNonNegative(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Required Deposit (₱)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm">₱</span>
                  <input
                    type="number"
                    min="0"
                    onKeyDown={handleNonNegativeKeyDown}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(sanitizeNonNegative(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes for Customer</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows="3"
                placeholder="Include special payment terms, venue guidelines, or quotation instructions for the customer..."
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              ></textarea>
            </div>
          </div>
        </div>

        {/* Right Side: Sticky Summary Panel */}
        <div className="w-full lg:w-96 bg-[#0F172A] text-white p-6 rounded-2xl shadow-2xl flex flex-col h-full max-h-full overflow-y-auto shrink-0 border border-slate-800">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-lg mb-4 pb-3 border-b border-white/10">
            <Calculator size={20} /> Quote Summary
          </div>

          <div className="space-y-3 flex-1 mb-6 text-sm">
            {!isFoodOnly && cleanNum(packagePrice) > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Base Package</span>
                <span>{fmt(packagePrice)}</span>
              </div>
            )}
            {!isSetupOnly && menuItems.length > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Food ({guestCount} pax)</span>
                <span>{fmt(menuSubtotal)}</span>
              </div>
            )}
            {!isFoodOnly && addOns.length > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Add-ons &amp; Services</span>
                <span>{fmt(addOnsSubtotal)}</span>
              </div>
            )}
            {additionalFees > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Additional Fees</span>
                <span>{fmt(additionalFees)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-100 font-semibold border-t border-white/10 pt-2 mt-2">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-300 text-xs">
              <span>Taxes</span>
              <span>+ {fmt(taxes)}</span>
            </div>
            <div className="flex justify-between text-slate-300 text-xs">
              <span>Discounts</span>
              <span>- {fmt(discounts)}</span>
            </div>

            <div className="pt-4 mt-4 border-t border-white/10 flex justify-between font-bold text-lg">
              <span>Total Cost</span>
              <span className="text-emerald-400">{fmt(totalCost)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-xs mt-2">
              <span>Required Deposit</span>
              <span>{fmt(depositVal)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-xs">
              <span>Remaining Balance</span>
              <span>{fmt(remainingBalance)}</span>
            </div>
          </div>

          {/* Pre-send Version Comparison Box */}
          {quotation && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={14} className="text-amber-300 shrink-0" />
                <span className="text-xs font-bold text-white">
                  Changes to Version {(Number(quotation.version_number) || 1) + 1}.0
                </span>
              </div>

              {pendingChanges.length === 0 ? (
                <p className="text-xs text-slate-400 leading-relaxed">
                  No changes detected yet. Modify the quote items above before publishing a new version.
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {pendingChanges.map((change, idx) => (
                    <li key={idx} className="text-xs text-slate-300 leading-relaxed">
                      <span className="font-semibold text-white">
                        {change.name ? `${change.label}: ${change.name}` : change.label}
                      </span>
                      {change.detail ? (
                        <span className="ml-1.5 text-emerald-300">{change.detail}</span>
                      ) : (
                        <span className="ml-1.5 inline-flex items-center gap-1 tabular-nums">
                          <span className="text-slate-500 line-through">{change.from}</span>
                          <ArrowRight size={10} className="text-slate-500 shrink-0" />
                          <span className="font-semibold text-white">{change.to}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Sticky Actions Footer */}
          <div className="mt-auto flex flex-col gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save size={16} />
              )}
              {submitting ? "Saving..." : (quotation ? "Send Revised Quotation" : "Send Quotation")}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
