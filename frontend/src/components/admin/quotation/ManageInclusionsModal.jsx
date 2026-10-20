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
  startingPrice = 0,
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
        item.quantity !== "" &&
        Number(item.quantity) !== Number(item.baseQuantity);
      const isAdd = isQtyModified && Number(item.quantity) > Number(item.baseQuantity);
      const isLess = isQtyModified && Number(item.quantity) < Number(item.baseQuantity);

      return {
        ...item,
        originalIndex,
        category,
        cleanName,
        defaultQty,
        unit,
        isQtyModified,
        isAdd,
        isLess,
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

  const numericStartingPrice = Math.max(0, Number(startingPrice) || 0);

  const totalRemovedDeductions = inclusions
    .filter((i) => i.removed && Number(i.deduction) > 0)
    .reduce((sum, i) => sum + Number(i.deduction), 0);

  const totalQuantityReductions = inclusions
    .filter(
      (i) =>
        !i.removed &&
        i.baseQuantity != null &&
        Number(i.quantity) < Number(i.baseQuantity) &&
        Number(i.adjustmentAmount ?? i.unitPrice) > 0
    )
    .reduce((sum, i) => sum + Number(i.adjustmentAmount ?? i.unitPrice), 0);

  const totalPackageReductions = totalRemovedDeductions + totalQuantityReductions;
  const isExceedingStartingPrice =
    numericStartingPrice > 0 && totalPackageReductions > numericStartingPrice;

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
            {isExceedingStartingPrice ? (
              <span className="text-red-600 font-semibold flex items-center gap-1">
                <AlertCircle size={13} />
                Total reductions ({formatCurrency(totalPackageReductions)}) exceed package base rate ({formatCurrency(numericStartingPrice)}).
              </span>
            ) : totalModifications > 0 ? (
              `${totalModifications} item modifications active.`
            ) : (
              "All standard package inclusions are active with standard pricing."
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-md text-white text-xs font-semibold transition-colors cursor-pointer self-end sm:self-auto shadow-xs ${
              isExceedingStartingPrice
                ? "bg-red-600 hover:bg-red-700"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {isExceedingStartingPrice ? "Close & Adjust Price" : "Save & Close"}
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

          {totalPackageReductions > 0 && (
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Total Price Reduction
              </span>
              <span
                className={`font-mono font-bold ${
                  isExceedingStartingPrice ? "text-red-600" : "text-emerald-700"
                }`}
              >
                -{formatCurrency(totalPackageReductions)}
              </span>
              {numericStartingPrice > 0 && (
                <span className="text-[10px] text-slate-400 block font-mono">
                  (Pkg base: {formatCurrency(numericStartingPrice)})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Warning Banner if deductions exceed starting price */}
        {isExceedingStartingPrice && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
            <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">
                Item reductions exceed package starting price
              </span>
              <p className="text-[11px] text-red-700 leading-snug">
                Item credits and quantity reductions take {formatCurrency(totalPackageReductions)} off
                the package starting price of {formatCurrency(numericStartingPrice)}. Lower the
                deductions or quantity reductions so the package base price does not become negative.
              </p>
            </div>
          </div>
        )}

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
                      className={`text-xs font-semibold uppercase tracking-wider ${
                        !isExcluded ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {!isExcluded ? "Included" : "Excluded"}
                    </span>
                  </label>

                  <div className="min-w-0 flex-1">
                    <span
                      className={`text-sm font-semibold block truncate ${
                        isExcluded ? "line-through text-slate-400" : "text-slate-900"
                      }`}
                    >
                      {item.cleanName}
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      {item.category}
                      {item.defaultQty && ` · Package standard: ${item.defaultQty}`}
                    </span>
                  </div>
                </div>

                {/* Right: Pricing impact or Quantity Adjustment */}
                {isExcluded ? (
                  <div className="flex flex-col items-end self-end sm:self-auto">
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded border border-slate-200">
                      <span className="text-xs sm:text-[13px] font-medium text-slate-600 whitespace-nowrap">
                        Price Reduction (₱):
                      </span>
                      <div className="relative w-28">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-sm text-slate-400">
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
                          className={`w-full rounded border pl-6 pr-2 py-1.5 text-sm min-h-[36px] text-right font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary ${
                            numericStartingPrice > 0 && Number(item.deduction) > numericStartingPrice
                              ? "border-red-400 bg-red-50/50 text-red-900"
                              : "border-slate-300 bg-white"
                          }`}
                        />
                      </div>
                    </div>
                    {numericStartingPrice > 0 && Number(item.deduction) > numericStartingPrice && (
                      <span className="text-xs text-red-600 font-medium mt-0.5">
                        Exceeds package base price
                      </span>
                    )}
                  </div>
                ) : item.baseQuantity != null ? (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-[13px] font-medium text-slate-600">Qty:</span>
                      <input
                        type="number"
                        min="0"
                        value={item.quantity ?? item.baseQuantity}
                        onChange={(e) =>
                          handleInclusionQuantity(item.originalIndex, e.target.value)
                        }
                        className="w-18 rounded border border-slate-300 px-2 py-1.5 text-sm min-h-[36px] text-center font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-xs sm:text-[13px] font-medium text-slate-500 min-w-[24px]">
                        {item.unit}
                      </span>
                    </div>

                    {item.isQtyModified && (() => {
                      const qtyDiff = Math.abs(Number(item.quantity) - Number(item.baseQuantity));
                      const rawAmt = Number(item.adjustmentAmount ?? item.unitPrice) || 0;
                      const perPiece = qtyDiff > 0 && rawAmt > 0 ? Math.round((rawAmt / qtyDiff) * 100) / 100 : 0;
                      const isExceeding = item.isLess && numericStartingPrice > 0 && rawAmt > numericStartingPrice;

                      return (
                        <div className="flex flex-col items-end">
                          <div
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-colors ${
                              isExceeding
                                ? "bg-red-50 border-red-300"
                                : item.isAdd
                                ? "bg-amber-50/50 border-amber-200"
                                : "bg-emerald-50/50 border-emerald-200"
                            }`}
                          >
                            <span
                              className={`text-xs font-bold whitespace-nowrap ${
                                isExceeding
                                  ? "text-red-700"
                                  : item.isAdd
                                  ? "text-amber-800"
                                  : "text-emerald-800"
                              }`}
                            >
                              {item.isAdd ? "Add:" : "Less:"}
                            </span>
                            <div className="relative w-28">
                              <span
                                className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-sm font-mono font-semibold ${
                                  isExceeding
                                    ? "text-red-600"
                                    : item.isAdd
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                                }`}
                              >
                                ₱
                              </span>
                              <input
                                id={`qb-inclusion-price-${item.originalIndex}`}
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={item.adjustmentAmount ?? item.unitPrice ?? ""}
                                onChange={(e) =>
                                  handleInclusionUnitPrice(
                                    item.originalIndex,
                                    e.target.value.replace(/[^0-9.]/g, "")
                                  )
                                }
                                className={`w-full rounded border pl-6 pr-2 py-1.5 text-sm min-h-[36px] text-right font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-primary ${
                                  isExceeding
                                    ? "border-red-400 bg-white text-red-900 focus:ring-red-400"
                                    : (!item.unitPrice && !item.adjustmentAmount) ||
                                      Number(item.adjustmentAmount ?? item.unitPrice) <= 0
                                    ? item.isAdd
                                      ? "border-amber-300 bg-white"
                                      : "border-slate-300 bg-white"
                                    : item.isAdd
                                    ? "border-amber-300 bg-white text-slate-900"
                                    : "border-emerald-300 bg-white text-emerald-900"
                                }`}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleInclusionQuantity(item.originalIndex, item.baseQuantity)
                              }
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
                              title="Reset quantity to package default"
                            >
                              <Undo2 size={13} />
                            </button>
                          </div>
                          {isExceeding ? (
                            <span className="text-[10px] text-red-600 font-medium mt-0.5">
                              Exceeds package base price
                            </span>
                          ) : perPiece > 0 ? (
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                              (≈ {formatCurrency(perPiece)}/{item.unit || "unit"})
                            </span>
                          ) : null}
                        </div>
                      );
                    })()}
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
