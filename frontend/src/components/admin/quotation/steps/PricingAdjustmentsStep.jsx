import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Package,
  Utensils,
  Sparkles,
  Truck,
  Clock,
  Percent,
  Plus,
  Trash2,
  Undo2,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sliders,
  AlertCircle,
  HelpCircle,
  Layers,
} from "lucide-react";
import { formatCurrency } from "../../../../utils/format";
import ManageInclusionsModal, {
  getCleanInclusionName,
  categorizeInclusion,
} from "../ManageInclusionsModal";

const PREDEFINED_UNITS = ["Per Guest", "Per Tray", "Per Bilao", "Per Kilo", "Per Piece"];

function MoneyInput({ value, onChange, placeholder = "0.00", disabled, className = "", id }) {
  const block = (e) => {
    if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") e.preventDefault();
  };
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-slate-400 font-medium">
        ₱
      </span>
      <input
        id={id}
        type="number"
        min="0"
        step="0.01"
        disabled={disabled}
        placeholder={placeholder}
        onKeyDown={block}
        onWheel={(e) => e.target.blur()}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
        className={`w-full rounded-md border border-slate-300 bg-white pl-6 pr-2.5 py-1.5 text-xs text-slate-900 font-mono font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-400 ${className}`}
      />
    </div>
  );
}

export default function PricingAdjustmentsStep({
  packageName,
  startingPrice,
  setStartingPrice,
  inclusions,
  handleInclusionQuantity,
  handleInclusionUnitPrice,
  handleInclusionDeduction,
  toggleInclusionRemoved,
  scaffoldOptions = [],
  selectedScaffoldId,
  handleScaffoldOptionChange,
  isCustomScaffold,
  scaffoldWidth,
  scaffoldLength,
  handleCustomScaffoldChange,
  isFoodOnly,
  isSetupOnly,
  cateringIncluded,
  offerContext,
  menuItems,
  handleMenuChange,
  toggleMenuRemoved,
  catalogMenuItems = [],
  onAddCatalogDish,
  onAddCustomDish,
  addOns,
  handleAddOnChange,
  toggleAddOnRemoved,
  catalogAddons = [],
  onAddCatalogAddon,
  onAddCustomAddon,
  transportationFee,
  setTransportationFee,
  includeOvertime,
  setIncludeOvertime,
  overtimeMode,
  setOvertimeMode,
  overtimeHours,
  setOvertimeHours,
  crewCount,
  setCrewCount,
  hourlyRatePerCrew,
  setHourlyRatePerCrew,
  flatOvertimeFee,
  setFlatOvertimeFee,
  computedOvertimeAmount,
  additionalFees,
  handleFeeChange,
  handleRemoveFee,
  handleAddFee,
  discounts,
  setDiscounts,
  taxes,
  setTaxes,
  errors = {},
  onProceedToReview,
}) {
  // Catalog Dish Search
  const [isDishSearchOpen, setIsDishSearchOpen] = useState(false);
  const [dishSearchQuery, setDishSearchQuery] = useState("");
  const dishSearchRef = useRef(null);

  // Catalog Add-on Search
  const [isAddonSearchOpen, setIsAddonSearchOpen] = useState(false);
  const [addonSearchQuery, setAddonSearchQuery] = useState("");
  const addonSearchRef = useRef(null);

  // Focused Manage Inclusions Modal state
  const [isManageInclusionsOpen, setIsManageInclusionsOpen] = useState(false);

  // Close search dropdowns when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (dishSearchRef.current && !dishSearchRef.current.contains(e.target)) {
        setIsDishSearchOpen(false);
      }
      if (addonSearchRef.current && !addonSearchRef.current.contains(e.target)) {
        setIsAddonSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const filteredDishes = catalogMenuItems.filter((dish) => {
    if (!dishSearchQuery.trim()) return true;
    const q = dishSearchQuery.toLowerCase().trim();
    return dish.name?.toLowerCase().includes(q) || dish.category?.toLowerCase().includes(q);
  });

  const filteredAddons = catalogAddons.filter((addon) => {
    if (!addonSearchQuery.trim()) return true;
    return addon.name?.toLowerCase().includes(addonSearchQuery.toLowerCase().trim());
  });

  const activeMenuItems = menuItems.filter((m) => !m.removed);
  const activeAddOns = addOns.filter((a) => !a.removed);

  // Inclusions metrics
  const totalInclusionsCount = inclusions.length;
  const excludedInclusions = useMemo(() => inclusions.filter((i) => i.removed), [inclusions]);
  const modifiedQtyInclusions = useMemo(
    () =>
      inclusions.filter(
        (i) =>
          !i.removed &&
          i.baseQuantity != null &&
          i.quantity != null &&
          Number(i.quantity) !== Number(i.baseQuantity)
      ),
    [inclusions]
  );
  const totalDeductions = excludedInclusions.reduce(
    (sum, i) => sum + (Number(i.deduction) || 0),
    0
  );

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-6 font-sans">
      {/* ------------------------------------------------------------------
          1. PACKAGE PRICE
      ------------------------------------------------------------------ */}
      <section
        id="pricing-package"
        className="bg-white rounded-lg border border-slate-200 p-4 space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-sans">
              <Package size={14} className="text-primary" /> Package Price
            </div>
            <p className="text-[11px] text-slate-500">
              The base package rate covering the event setup and core service.
            </p>
          </div>
          <span className="text-xs font-semibold text-primary">{packageName}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-start">
          {/* Base Starting Price */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Package Base Price (₱) *
            </label>
            <MoneyInput
              id="qb-starting-price"
              value={startingPrice}
              onChange={setStartingPrice}
              placeholder="0.00"
              className={errors.package_name ? "border-red-400 bg-red-50/40" : ""}
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              {offerContext ? "Pre-calculated combo rate" : "Starting price for this package"}
            </span>
          </div>

          {/* Event Space Size Selector if applicable */}
          {!isFoodOnly && !offerContext && scaffoldOptions.length > 0 && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Event Space Dimensions
              </label>
              <select
                value={isCustomScaffold ? "custom" : selectedScaffoldId}
                onChange={(e) => handleScaffoldOptionChange(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {scaffoldOptions.map((opt, idx) => (
                  <option key={String(opt._id || idx)} value={String(opt._id || idx)}>
                    {opt.label || `${opt.width_ft || 0}×${opt.length_ft || 0} ft`}{" "}
                    {opt.price ? `(₱${Number(opt.price).toLocaleString()})` : ""}
                  </option>
                ))}
                <option value="custom">Custom Dimensions...</option>
              </select>

              {isCustomScaffold && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <input
                    type="number"
                    placeholder="Width (ft)"
                    value={scaffoldWidth}
                    onChange={(e) => handleCustomScaffoldChange(e.target.value, scaffoldLength)}
                    className="w-1/2 rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                  <span className="text-slate-400 text-xs">×</span>
                  <input
                    type="number"
                    placeholder="Length (ft)"
                    value={scaffoldLength}
                    onChange={(e) => handleCustomScaffoldChange(scaffoldWidth, e.target.value)}
                    className="w-1/2 rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------
          2. INCLUDED ITEMS (Clean Summary + Focused Management Modal)
      ------------------------------------------------------------------ */}
      {totalInclusionsCount > 0 && (
        <section
          id="pricing-inclusions"
          className="bg-white rounded-lg border border-slate-200 p-4 space-y-2.5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-sans">
                  <Check size={14} className="text-primary" /> Included Items
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {totalInclusionsCount - excludedInclusions.length} included
                  {excludedInclusions.length + modifiedQtyInclusions.length > 0
                    ? ` · ${excludedInclusions.length + modifiedQtyInclusions.length} changed`
                    : " · all standard"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Dining wares, tables, chairs, staging, and service staff standard to this package.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsManageInclusionsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <Sliders size={12} className="text-slate-500" />
              <span>Manage Included Items</span>
            </button>
          </div>

          {/* Quick Preview of Excluded/Adjusted Items */}
          {excludedInclusions.length > 0 || modifiedQtyInclusions.length > 0 ? (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
                Modifications:
              </span>
              {excludedInclusions.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1"
                >
                  <span className="line-through">{getCleanInclusionName(item.name)}</span>
                  {Number(item.deduction) > 0 && (
                    <span className="font-mono text-emerald-700 font-bold">
                      (-{formatCurrency(item.deduction)})
                    </span>
                  )}
                </span>
              ))}

              {modifiedQtyInclusions.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[11px] bg-primary/5 text-primary border border-primary/20 flex items-center gap-1"
                >
                  <span>{getCleanInclusionName(item.name)}:</span>
                  <span className="font-mono font-bold">
                    {item.quantity} (orig: {item.baseQuantity})
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
              All standard package inclusions are active with standard package pricing.
            </div>
          )}

          {/* Focused Manage Inclusions Dialog */}
          <ManageInclusionsModal
            open={isManageInclusionsOpen}
            onClose={() => setIsManageInclusionsOpen(false)}
            inclusions={inclusions}
            handleInclusionQuantity={handleInclusionQuantity}
            handleInclusionUnitPrice={handleInclusionUnitPrice}
            handleInclusionDeduction={handleInclusionDeduction}
            toggleInclusionRemoved={toggleInclusionRemoved}
          />
        </section>
      )}

      {/* ------------------------------------------------------------------
          3. MENU PRICING
      ------------------------------------------------------------------ */}
      {cateringIncluded && (
        <section
          id="pricing-menu"
          className="bg-white rounded-lg border border-slate-200 p-4 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-sans">
                <Utensils size={14} className="text-primary" /> Menu Pricing ({activeMenuItems.length} Dishes Quoted)
              </div>
              <p className="text-[11px] text-slate-500">
                Specify unit price and portion unit (Per Guest, Per Tray, Per Bilao) for each dish.
              </p>
            </div>

            {/* Searchable Add Dish Dropdown */}
            <div className="relative" ref={dishSearchRef}>
              <button
                type="button"
                onClick={() => setIsDishSearchOpen(!isDishSearchOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
              >
                <Plus size={13} />
                <span>Add Dish from Catalog</span>
              </button>

              {isDishSearchOpen && (
                <div className="absolute right-0 mt-1 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 p-2 text-xs">
                  <div className="relative mb-2">
                    <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search dish or category..."
                      value={dishSearchQuery}
                      onChange={(e) => setDishSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 rounded border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-400"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredDishes.length === 0 ? (
                      <div className="p-3 text-center text-slate-500">
                        <span>No dishes found.</span>
                        {dishSearchQuery.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              onAddCustomDish(dishSearchQuery.trim());
                              setDishSearchQuery("");
                              setIsDishSearchOpen(false);
                            }}
                            className="block mx-auto mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
                          >
                            + Add &ldquo;{dishSearchQuery.trim()}&rdquo; as custom dish
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredDishes.map((dish) => (
                        <button
                          key={dish._id}
                          type="button"
                          onClick={() => {
                            onAddCatalogDish(dish);
                            setIsDishSearchOpen(false);
                            setDishSearchQuery("");
                          }}
                          className="w-full text-left p-2 hover:bg-slate-50 rounded flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div>
                            <span className="font-medium text-slate-800 block">{dish.name}</span>
                            <span className="text-[10px] text-slate-500">{dish.category || "Course"}</span>
                          </div>
                          {dish.price > 0 && (
                            <span className="font-mono text-xs text-slate-700 font-medium">
                              ₱{Number(dish.price).toLocaleString()}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dishes Table */}
          {menuItems.length === 0 ? (
            <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              No dishes currently added. Click &ldquo;Add Dish from Catalog&rdquo; to add dishes.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 px-3 min-w-[170px]">Dish &amp; Course</th>
                    <th className="py-2 px-2 w-36">Portion Unit</th>
                    <th className="py-2 px-2 w-20 text-center">Quantity</th>
                    <th className="py-2 px-2 w-28 text-right">Price per Unit</th>
                    <th className="py-2 px-2 w-28 text-right">Line Total</th>
                    <th className="py-2 px-2 w-14 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {menuItems.map((item, index) => {
                    const qty = Math.max(1, Number(item.quantity) || 1);
                    const price = Number(item.price) || 0;
                    const lineTotal = qty * price;
                    const hasError = errors[`menu_items.${index}.price`] || errors[`menu_items.${index}.quantity`];

                    return (
                      <tr
                        key={index}
                        className={`transition-colors ${
                          item.removed
                            ? "bg-slate-50 text-slate-400 opacity-60"
                            : hasError
                            ? "bg-red-50/30"
                            : "hover:bg-slate-50/40"
                        }`}
                      >
                        {/* Name */}
                        <td className="py-2 px-3">
                          <span className={`font-semibold block ${item.removed ? "line-through text-slate-400" : "text-slate-900"}`}>
                            {item.name || "Unnamed Dish"}
                          </span>
                          {item.category && (
                            <span className="text-[10px] text-slate-500 block">{item.category}</span>
                          )}
                        </td>

                        {/* Portion Unit Select */}
                        <td className="py-2 px-2">
                          <select
                            disabled={item.removed}
                            value={
                              PREDEFINED_UNITS.includes(item.unit)
                                ? item.unit
                                : item.unit
                                ? "custom"
                                : "Per Guest"
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "custom") {
                                handleMenuChange(index, "unit", "");
                                handleMenuChange(index, "isCustomUnit", true);
                              } else {
                                handleMenuChange(index, "unit", val);
                                handleMenuChange(index, "isCustomUnit", false);
                              }
                            }}
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {PREDEFINED_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                            <option value="custom">Custom...</option>
                          </select>
                          {item.isCustomUnit && (
                            <input
                              type="text"
                              placeholder="Specify unit..."
                              value={item.unit}
                              onChange={(e) => handleMenuChange(index, "unit", e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-0.5 text-xs mt-1 placeholder:text-slate-400"
                            />
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            disabled={item.removed}
                            value={item.quantity}
                            onChange={(e) => handleMenuChange(index, "quantity", e.target.value)}
                            className="w-16 rounded border border-slate-300 px-1.5 py-1 text-xs text-center font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="py-2 px-2 text-right">
                          <MoneyInput
                            value={item.price}
                            disabled={item.removed}
                            onChange={(val) => handleMenuChange(index, "price", val)}
                            placeholder="0.00"
                            className="w-24 text-right ml-auto"
                          />
                        </td>

                        {/* Line Total */}
                        <td className="py-2 px-2 text-right font-mono font-semibold text-slate-900 tabular-nums">
                          {item.removed ? "—" : formatCurrency(lineTotal)}
                        </td>

                        {/* Action */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleMenuRemoved(index)}
                            title={item.removed ? "Restore dish" : "Remove dish"}
                            className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          >
                            {item.removed ? <Undo2 size={13} /> : <Trash2 size={13} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------------------
          4. EXTRA SERVICES & EQUIPMENT
      ------------------------------------------------------------------ */}
      <section
        id="pricing-addons"
        className="bg-white rounded-lg border border-slate-200 p-4 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-sans">
              <Sparkles size={14} className="text-primary" /> Extra Services ({activeAddOns.length} Items Quoted)
            </div>
            <p className="text-[11px] text-slate-500">
              Additional equipment rentals, sound systems, styling upgrades, or custom requests.
            </p>
          </div>

          <div className="relative" ref={addonSearchRef}>
            <button
              type="button"
              onClick={() => setIsAddonSearchOpen(!isAddonSearchOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            >
              <Plus size={13} />
              <span>Add Extra Service</span>
            </button>

            {isAddonSearchOpen && (
              <div className="absolute right-0 mt-1 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 p-2 text-xs">
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search add-on catalog..."
                    value={addonSearchQuery}
                    onChange={(e) => setAddonSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 rounded border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredAddons.length === 0 ? (
                    <div className="p-3 text-center text-slate-500">
                      <span>No add-ons found.</span>
                      {addonSearchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            onAddCustomAddon(addonSearchQuery.trim());
                            setAddonSearchQuery("");
                            setIsAddonSearchOpen(false);
                          }}
                          className="block mx-auto mt-2 text-xs font-semibold text-primary hover:underline cursor-pointer"
                        >
                          + Add &ldquo;{addonSearchQuery.trim()}&rdquo; as custom service
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredAddons.map((addon) => (
                      <button
                        key={addon._id}
                        type="button"
                        onClick={() => {
                          onAddCatalogAddon(addon);
                          setIsAddonSearchOpen(false);
                          setAddonSearchQuery("");
                        }}
                        className="w-full text-left p-2 hover:bg-slate-50 rounded flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="font-medium text-slate-800 block">{addon.name}</span>
                          {addon.category && (
                            <span className="text-[10px] text-slate-500">{addon.category}</span>
                          )}
                        </div>
                        {addon.price > 0 && (
                          <span className="font-mono text-xs text-slate-700 font-medium">
                            ₱{Number(addon.price).toLocaleString()}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {addOns.length === 0 ? (
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
            No extra services added.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-md">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2 px-3 min-w-[180px]">Service / Equipment Name</th>
                  <th className="py-2 px-2 w-20 text-center">Quantity</th>
                  <th className="py-2 px-2 w-28 text-right">Price (₱)</th>
                  <th className="py-2 px-2 w-28 text-right">Line Total</th>
                  <th className="py-2 px-2 w-14 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {addOns.map((item, index) => {
                  const qty = Math.max(1, Number(item.quantity) || 1);
                  const price = Number(item.price) || 0;
                  const lineTotal = qty * price;

                  return (
                    <tr
                      key={index}
                      className={`transition-colors ${
                        item.removed ? "bg-slate-50 text-slate-400 opacity-60" : "hover:bg-slate-50/40"
                      }`}
                    >
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {item.name}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="1"
                          disabled={item.removed}
                          value={item.quantity}
                          onChange={(e) => handleAddOnChange(index, "quantity", e.target.value)}
                          className="w-16 rounded border border-slate-300 px-1.5 py-1 text-xs text-center font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <MoneyInput
                          value={item.price}
                          disabled={item.removed}
                          onChange={(val) => handleAddOnChange(index, "price", val)}
                          placeholder="0.00"
                          className="w-24 text-right ml-auto"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {item.removed ? "—" : formatCurrency(lineTotal)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAddOnRemoved(index)}
                          title={item.removed ? "Restore service" : "Remove service"}
                          className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          {item.removed ? <Undo2 size={13} /> : <Trash2 size={13} />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------
          5. OTHER CHARGES & DELIVERY
      ------------------------------------------------------------------ */}
      <section
        id="pricing-charges"
        className="bg-white rounded-lg border border-slate-200 p-4 space-y-3"
      >
        <div className="border-b border-slate-100 pb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-sans">
            <Truck size={14} className="text-primary" /> Other Charges &amp; Delivery
          </div>
          <p className="text-[11px] text-slate-500">
            Delivery fees, crew overtime, and any special custom fees for this event.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Delivery Fee */}
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80 space-y-1">
            <label className="block text-[11px] font-semibold text-slate-700">
              Delivery / Transportation Fee (₱)
            </label>
            <MoneyInput
              value={transportationFee}
              onChange={setTransportationFee}
              placeholder="0.00"
            />
            <span className="text-[10px] text-slate-500 block">
              Covers vehicle dispatch and venue logistics
            </span>
          </div>

          {/* Overtime Calculator */}
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock size={12} className="text-primary" /> Crew &amp; Event Overtime
              </label>
              <input
                type="checkbox"
                checked={includeOvertime}
                onChange={(e) => setIncludeOvertime(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {includeOvertime ? (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setOvertimeMode("per_crew")}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                      overtimeMode === "per_crew"
                        ? "bg-primary text-white border-primary font-semibold"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Per Crew / Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => setOvertimeMode("flat")}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                      overtimeMode === "flat"
                        ? "bg-primary text-white border-primary font-semibold"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Flat Rate
                  </button>
                </div>

                {overtimeMode === "per_crew" ? (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Hours</span>
                      <input
                        type="number"
                        min="1"
                        value={overtimeHours}
                        onChange={(e) => setOvertimeHours(e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-center font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Crew count</span>
                      <input
                        type="number"
                        min="1"
                        value={crewCount}
                        onChange={(e) => setCrewCount(e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-center font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">Rate/hr (₱)</span>
                      <input
                        type="number"
                        min="0"
                        value={hourlyRatePerCrew}
                        onChange={(e) => setHourlyRatePerCrew(e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-center font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-0.5">Flat Fee (₱)</span>
                    <MoneyInput value={flatOvertimeFee} onChange={setFlatOvertimeFee} />
                  </div>
                )}

                <div className="text-[11px] text-slate-600 flex justify-between items-baseline pt-1">
                  <span>Computed overtime:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(computedOvertimeAmount)}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 block">
                Enable if the event requires crew beyond the standard 4 hours
              </span>
            )}
          </div>
        </div>

        {/* Additional custom charges */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-700">
              Custom Additional Charges
            </span>
            <button
              type="button"
              onClick={handleAddFee}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              <Plus size={12} /> Add Charge
            </button>
          </div>

          {additionalFees.filter((f) => !f.isOvertime).length > 0 && (
            <div className="space-y-1.5">
              {additionalFees
                .map((fee, index) => ({ fee, index }))
                .filter(({ fee }) => !fee.isOvertime)
                .map(({ fee, index }) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Corkage Fee, Standby Generator"
                      value={fee.name}
                      onChange={(e) => handleFeeChange(index, "name", e.target.value)}
                      className="flex-1 rounded border border-slate-300 px-2.5 py-1 text-xs placeholder:text-slate-400"
                    />
                    <MoneyInput
                      value={fee.amount}
                      onChange={(val) => handleFeeChange(index, "amount", val)}
                      placeholder="0.00"
                      className="w-28 text-right"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFee(index)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------
          6. DISCOUNT & TAXES
      ------------------------------------------------------------------ */}
      <section
        id="pricing-discount"
        className="bg-white rounded-lg border border-slate-200 p-4 space-y-3"
      >
        <div className="border-b border-slate-100 pb-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-sans">
            <Percent size={14} className="text-primary" /> Discount &amp; Taxes
          </div>
          <p className="text-[11px] text-slate-500">
            Apply promotional discounts or optional tax adjustments.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Discount (₱)
            </label>
            <MoneyInput
              value={discounts}
              onChange={setDiscounts}
              placeholder="0.00"
              className="text-emerald-700 font-bold"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Deducted directly from the subtotal
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Taxes / VAT (₱)
            </label>
            <MoneyInput value={taxes} onChange={setTaxes} placeholder="0.00" />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Leave at 0 if prices are already tax-inclusive
            </span>
          </div>
        </div>
      </section>

      {/* Bottom Action */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-slate-500">
          All prices set? Proceed to review the full quotation and set deposit terms.
        </span>
        <button
          type="button"
          onClick={onProceedToReview}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
        >
          <span>Proceed to Review &amp; Send</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
