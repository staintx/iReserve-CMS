import React, { useState, useMemo } from "react";
import Modal from "../../common/Modal";
import {
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Undo2,
  DollarSign,
  Layers,
  UtensilsCrossed,
  Armchair,
  Users2,
  Package,
} from "lucide-react";
import { parseInclusion, inclusionDisplayName } from "../../../lib/packageDisplay";
import { formatCurrency } from "../../../utils/format";

/**
 * Categorizes an inclusion string into one of 4 clean business categories:
 * - Dining & Service
 * - Setup & Equipment
 * - Staff & Service
 * - Other Supplies
 */
export function categorizeInclusion(entryName) {
  const parsed = parseInclusion(entryName);
  const rawCat = (parsed?.category || "").toLowerCase();
  const nameLower = (parsed?.name || entryName || "").toLowerCase();

  if (
    rawCat.includes("dining") ||
    rawCat.includes("tableware") ||
    rawCat.includes("cutlery") ||
    rawCat.includes("plate") ||
    rawCat.includes("glass") ||
    rawCat.includes("linen") ||
    rawCat.includes("inventory") ||
    nameLower.includes("plate") ||
    nameLower.includes("spoon") ||
    nameLower.includes("fork") ||
    nameLower.includes("glass") ||
    nameLower.includes("goblet") ||
    nameLower.includes("napkin") ||
    nameLower.includes("chafing") ||
    nameLower.includes("dish")
  ) {
    return "Dining & Service";
  }

  if (
    rawCat.includes("staff") ||
    rawCat.includes("waiter") ||
    rawCat.includes("crew") ||
    rawCat.includes("coordinator") ||
    rawCat.includes("chef") ||
    rawCat.includes("bartender") ||
    nameLower.includes("waiter") ||
    nameLower.includes("staff") ||
    nameLower.includes("crew") ||
    nameLower.includes("attendant")
  ) {
    return "Staff & Service";
  }

  if (
    rawCat.includes("setup") ||
    rawCat.includes("furniture") ||
    rawCat.includes("stage") ||
    rawCat.includes("backdrop") ||
    rawCat.includes("scaffold") ||
    rawCat.includes("tent") ||
    rawCat.includes("table") ||
    rawCat.includes("chair") ||
    rawCat.includes("carpet") ||
    rawCat.includes("light") ||
    rawCat.includes("sound") ||
    rawCat.includes("equipment") ||
    nameLower.includes("table") ||
    nameLower.includes("chair") ||
    nameLower.includes("stage") ||
    nameLower.includes("backdrop") ||
    nameLower.includes("carpet") ||
    nameLower.includes("chandelier") ||
    nameLower.includes("tent") ||
    nameLower.includes("fan")
  ) {
    return "Setup & Equipment";
  }

  return "Other Supplies";
}

/**
 * Extracts a clean display name without any raw bracket tags like [Dining & Service Inventory]
 */
export function getCleanInclusionName(entryName) {
  const display = inclusionDisplayName(entryName);
  if (display) return display;
  return String(entryName || "")
    .replace(/^\[[^\]]+\]\s*/, "")
    .replace(/\s*\([^)]*\)$/, "")
    .trim();
}

/**
 * Extracts clean initial quantity text from the inclusion name
 */
export function getCleanInclusionQty(entryName) {
  const parsed = parseInclusion(entryName);
  return parsed?.qty || null;
}

/**
 * Sensible predefined units for inclusion quantities
 */
export function getInclusionUnit(category, defaultQty) {
  if (defaultQty) {
    const match = String(defaultQty).match(/^\d+(?:\.\d+)?\s*([a-zA-Z]+)/);
    if (match && match[1]) return match[1];
  }
  if (category === "Staff & Service") return "staff";
  if (category === "Dining & Service") return "pcs";
  if (category === "Setup & Equipment") return "sets";
  return "pcs";
}

export default function ManageInclusionsModal({
  open,
  onClose,
  inclusions = [],
  handleInclusionQuantity,
  handleInclusionUnitPrice,
  handleInclusionDeduction,
  toggleInclusionRemoved,
}) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", label: "All Items", icon: Layers },
    { id: "Dining & Service", label: "Dining & Service", icon: UtensilsCrossed },
    { id: "Setup & Equipment", label: "Setup & Equipment", icon: Armchair },
    { id: "Staff & Service", label: "Staff & Service", icon: Users2 },
    { id: "Other Supplies", label: "Other Supplies", icon: Package },
  ];

  // Grouped items with their original indices and sensible units
  const itemsWithMeta = useMemo(() => {
    return inclusions.map((item, originalIndex) => {
      const category = categorizeInclusion(item.name);
      const cleanName = getCleanInclusionName(item.name);
      const defaultQty = getCleanInclusionQty(item.name);
      const unit = getInclusionUnit(category, defaultQty);
      const isQtyModified =
        !item.removed &&
        item.baseQuantity != null &&
        item.quantity != null &&
        Number(item.quantity) !== Number(item.baseQuantity);

      return {
        ...item,
        originalIndex,
        category,
        cleanName,
        defaultQty,
        unit,
        isQtyModified,
      };
    });
  }, [inclusions]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return itemsWithMeta;
    return itemsWithMeta.filter((i) => i.category === selectedCategory);
  }, [itemsWithMeta, selectedCategory]);

  const totalCount = inclusions.length;
  const excludedCount = inclusions.filter((i) => i.removed).length;
  const includedCount = totalCount - excludedCount;
  const modifiedQtyCount = itemsWithMeta.filter((i) => i.isQtyModified).length;
  const totalModifications = excludedCount + modifiedQtyCount;

  const totalDeductions = inclusions
    .filter((i) => i.removed && Number(i.deduction) > 0)
    .reduce((sum, i) => sum + Number(i.deduction), 0);

  if (!open) return null;

  return (
    <Modal
      title="Manage Included Items"
      description="Select items to include or exclude, and adjust quantities where applicable."
      onClose={onClose}
      className="max-w-3xl w-[95vw] quotation-builder-modal font-sans"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <span className="text-xs text-slate-500">
            {totalModifications > 0
              ? `${totalModifications} item modifications active.`
              : "All standard package inclusions are active with standard pricing."}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer self-end sm:self-auto shadow-xs"
          >
            Save &amp; Close
          </button>
        </div>
      }
    >
      <div className="space-y-3 font-sans pb-2">
        {/* Status Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Package Inclusions
              </span>
              <span className="font-semibold text-slate-800">
                {includedCount} of {totalCount} included
              </span>
            </div>
            {totalModifications > 0 && (
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                {totalModifications} {totalModifications === 1 ? "item modified" : "items modified"}
              </span>
            )}
          </div>

          {totalDeductions > 0 && (
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Price Reduction
              </span>
              <span className="font-mono font-bold text-emerald-700">
                -{formatCurrency(totalDeductions)}
              </span>
            </div>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 text-xs no-scrollbar">
          {categories.map((cat) => {
            const CatIcon = cat.icon;
            const count =
              cat.id === "all"
                ? totalCount
                : itemsWithMeta.filter((i) => i.category === cat.id).length;
            if (count === 0 && cat.id !== "all") return null;

            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-md font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-slate-900 text-white font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <CatIcon size={12} className="opacity-80" />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Inclusions List */}
        <div className="space-y-2 pt-1">
          {filteredItems.map((item) => {
            const isExcluded = item.removed;

            return (
              <div
                key={item.originalIndex}
                className={`p-3 rounded-lg border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                  isExcluded
                    ? "bg-slate-50/80 border-slate-200 text-slate-400"
                    : item.isQtyModified
                    ? "bg-primary/5 border-primary/30 text-slate-900"
                    : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                }`}
              >
                {/* Left: Checkbox Toggle & Clean Name */}
                <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => toggleInclusionRemoved(item.originalIndex)}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                    />
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-wider ${
                        !isExcluded ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {!isExcluded ? "Included" : "Excluded"}
                    </span>
                  </label>

                  <div className="min-w-0 flex-1">
                    <span
                      className={`font-semibold block truncate ${
                        isExcluded ? "line-through text-slate-400" : "text-slate-900"
                      }`}
                    >
                      {item.cleanName}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {item.category}
                      {item.defaultQty && ` · Package standard: ${item.defaultQty}`}
                    </span>
                  </div>
                </div>

                {/* Right: Pricing impact or Quantity Adjustment */}
                {isExcluded ? (
                  <div className="flex items-center gap-1.5 self-end sm:self-auto bg-white px-2.5 py-1 rounded border border-slate-200">
                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                      Price Reduction (₱):
                    </span>
                    <div className="relative w-24">
                      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-xs text-slate-400">
                        ₱
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.deduction}
                        onChange={(e) =>
                          handleInclusionDeduction(
                            item.originalIndex,
                            e.target.value.replace(/[^0-9.]/g, "")
                          )
                        }
                        className="w-full rounded border border-slate-300 bg-white pl-5 pr-1.5 py-1 text-xs text-right font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                ) : item.baseQuantity != null ? (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">Qty:</span>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity ?? item.baseQuantity}
                        onChange={(e) =>
                          handleInclusionQuantity(item.originalIndex, e.target.value)
                        }
                        className="w-16 rounded border border-slate-300 px-1.5 py-1 text-xs text-center font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-[11px] font-medium text-slate-500 min-w-[24px]">
                        {item.unit}
                      </span>
                    </div>

                    {item.isQtyModified && (
                      <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded border border-slate-200">
                        <span className="text-[10.5px] text-slate-500 whitespace-nowrap">
                          Rate/{item.unit}:
                        </span>
                        <div className="relative w-20">
                          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1.5 text-xs text-slate-400">
                            ₱
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleInclusionUnitPrice(
                                item.originalIndex,
                                e.target.value.replace(/[^0-9.]/g, "")
                              )
                            }
                            className="w-full rounded border border-slate-300 bg-white pl-4 pr-1 py-0.5 text-xs text-right font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
