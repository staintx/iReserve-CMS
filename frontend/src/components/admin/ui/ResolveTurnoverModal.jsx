import React, { useState, useId } from "react";
import {
  X,
  Wrench,
  RotateCcw,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Boxes,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export default function ResolveTurnoverModal({
  item,
  initialMode = "repair_damages", // "repair_damages" | "write_off_damages" | "recover_missing" | "write_off_missing"
  onClose,
  onSuccess,
}) {
  const { notify } = useToast();
  const quantityInputId = useId();
  const reasonInputId = useId();

  const damagedCount = Number(item?.damaged_quantity || 0);
  const missingCount = Number(item?.missing_quantity || 0);
  const activeCount = Number(item?.quantity || 0);

  // If damaged exists, default to damaged, else missing
  const defaultAction =
    initialMode && (initialMode.includes("damage") ? damagedCount > 0 : missingCount > 0)
      ? initialMode
      : damagedCount > 0
      ? "repair_damages"
      : "recover_missing";

  const [selectedAction, setSelectedAction] = useState(defaultAction);
  const maxAvailable = selectedAction.includes("damage") ? damagedCount : missingCount;

  const [quantity, setQuantity] = useState(maxAvailable > 0 ? 1 : 0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Adjust max when action changes
  const handleActionChange = (action) => {
    setSelectedAction(action);
    const max = action.includes("damage") ? damagedCount : missingCount;
    setQuantity(max > 0 ? Math.min(Math.max(1, quantity), max) : 0);
  };

  const isRepair = selectedAction === "repair_damages";
  const isRecover = selectedAction === "recover_missing";
  const isRestockAction = isRepair || isRecover;

  const numQty = Number(quantity) || 0;
  const validQuantity = numQty > 0 && numQty <= maxAvailable;

  const projectedActive = isRestockAction ? activeCount + numQty : activeCount;
  const projectedDamaged = selectedAction.includes("damage") ? Math.max(0, damagedCount - numQty) : damagedCount;
  const projectedMissing = selectedAction.includes("missing") ? Math.max(0, missingCount - numQty) : missingCount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validQuantity) {
      notify(`Please enter a quantity between 1 and ${maxAvailable}`, "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await AdminAPI.resolveInventoryTurnover(item._id, {
        type: selectedAction,
        quantity: numQty,
        reason: reason.trim() || undefined,
      });

      notify(res.data?.message || "Turnover stock updated successfully!", "success");
      if (onSuccess) onSuccess(res.data?.item);
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to resolve equipment turnover", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Boxes size={18} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Resolve Equipment Turnover</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {item.item_name} · {item.category || "Inventory"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 text-xs">
            {/* Current Turnover Status KPI */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Active Stock</span>
                <span className="font-mono font-bold text-sm text-slate-800">{activeCount}</span>
              </div>
              <div
                className={`p-2.5 rounded-lg border text-center ${
                  damagedCount > 0
                    ? "bg-rose-50/60 border-rose-200 text-rose-800"
                    : "bg-slate-50/40 border-slate-200 text-slate-400"
                }`}
              >
                <span className="text-[10px] uppercase font-bold block flex items-center justify-center gap-1">
                  <AlertTriangle size={10} /> Damaged
                </span>
                <span className="font-mono font-bold text-sm">{damagedCount}</span>
              </div>
              <div
                className={`p-2.5 rounded-lg border text-center ${
                  missingCount > 0
                    ? "bg-amber-50/60 border-amber-200 text-amber-800"
                    : "bg-slate-50/40 border-slate-200 text-slate-400"
                }`}
              >
                <span className="text-[10px] uppercase font-bold block flex items-center justify-center gap-1">
                  <AlertCircle size={10} /> Missing
                </span>
                <span className="font-mono font-bold text-sm">{missingCount}</span>
              </div>
            </div>

            {/* Action Selection */}
            <div className="space-y-2">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10.5px] block">
                Select Resolution Action
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 1. Repair Damaged Units */}
                <button
                  type="button"
                  disabled={damagedCount === 0}
                  onClick={() => handleActionChange("repair_damages")}
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedAction === "repair_damages"
                      ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <Wrench
                    size={16}
                    className={`mt-0.5 shrink-0 ${
                      selectedAction === "repair_damages" ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Restock Repaired</span>
                      {damagedCount > 0 && (
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-rose-100 text-rose-800">
                          {damagedCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                      Fixed/repaired equipment returns to usable active inventory.
                    </p>
                  </div>
                </button>

                {/* 2. Write-off Damaged Units */}
                <button
                  type="button"
                  disabled={damagedCount === 0}
                  onClick={() => handleActionChange("write_off_damages")}
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedAction === "write_off_damages"
                      ? "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <Trash2
                    size={16}
                    className={`mt-0.5 shrink-0 ${
                      selectedAction === "write_off_damages" ? "text-rose-600" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Write Off Damaged</span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                      Unrepairable items are permanently disposed & written off.
                    </p>
                  </div>
                </button>

                {/* 3. Recover Missing Units */}
                <button
                  type="button"
                  disabled={missingCount === 0}
                  onClick={() => handleActionChange("recover_missing")}
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedAction === "recover_missing"
                      ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <RotateCcw
                    size={16}
                    className={`mt-0.5 shrink-0 ${
                      selectedAction === "recover_missing" ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Recovered Missing</span>
                      {missingCount > 0 && (
                        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-amber-100 text-amber-800">
                          {missingCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                      Items retrieved from venue return to active stock.
                    </p>
                  </div>
                </button>

                {/* 4. Write-off Missing Units */}
                <button
                  type="button"
                  disabled={missingCount === 0}
                  onClick={() => handleActionChange("write_off_missing")}
                  className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    selectedAction === "write_off_missing"
                      ? "border-rose-500 bg-rose-50/50 ring-1 ring-rose-500"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <AlertCircle
                    size={16}
                    className={`mt-0.5 shrink-0 ${
                      selectedAction === "write_off_missing" ? "text-rose-600" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Write Off Lost</span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                      Confirmed lost gear written off from inventory balances.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Quantity Input with quick buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={quantityInputId} className="font-bold text-slate-700 text-[10.5px] uppercase tracking-wider">
                  Quantity to Resolve
                </label>
                <span className="text-[10.5px] text-slate-500">
                  Maximum available: <strong className="font-mono text-slate-800">{maxAvailable}</strong> units
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id={quantityInputId}
                  type="number"
                  min="1"
                  max={maxAvailable}
                  value={quantity || ""}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-28 h-8 px-3 rounded-md border border-slate-300 font-mono font-bold text-sm bg-white text-slate-900 focus:border-primary focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => setQuantity(1)}
                  disabled={maxAvailable === 0}
                  className="h-8 px-2.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  1 Unit
                </button>

                <button
                  type="button"
                  onClick={() => setQuantity(maxAvailable)}
                  disabled={maxAvailable === 0}
                  className="h-8 px-2.5 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                >
                  All ({maxAvailable})
                </button>
              </div>
            </div>

            {/* Reason / Remarks */}
            <div className="space-y-1">
              <label htmlFor={reasonInputId} className="font-bold text-slate-700 text-[10.5px] uppercase tracking-wider block">
                Resolution Reason / Audit Notes (Optional)
              </label>
              <input
                id={reasonInputId}
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  isRepair
                    ? "e.g. Repaired broken hinge in workshop"
                    : isRecover
                    ? "e.g. Picked up from hotel ballroom after turnover"
                    : "e.g. Scrapped beyond economical repair"
                }
                className="w-full h-8 px-3 rounded-md border border-slate-300 bg-white text-slate-900 focus:border-primary focus:outline-none"
              />
            </div>

            {/* Impact / Forecast Banner */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <span className="font-bold text-slate-700 text-[11px] block">Projected Inventory Impact:</span>
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                {isRestockAction && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Active Stock:</span>
                    <span className="font-mono font-bold text-slate-700">{activeCount}</span>
                    <ArrowRight size={11} className="text-slate-400" />
                    <span className="font-mono font-bold text-emerald-600">{projectedActive}</span>
                  </div>
                )}
                {selectedAction.includes("damage") && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Damaged Stock:</span>
                    <span className="font-mono font-bold text-slate-700">{damagedCount}</span>
                    <ArrowRight size={11} className="text-slate-400" />
                    <span className="font-mono font-bold text-slate-900">{projectedDamaged}</span>
                  </div>
                )}
                {selectedAction.includes("missing") && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Missing Stock:</span>
                    <span className="font-mono font-bold text-slate-700">{missingCount}</span>
                    <ArrowRight size={11} className="text-slate-400" />
                    <span className="font-mono font-bold text-slate-900">{projectedMissing}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/80">
            <Btn type="button" variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Btn>
            <Btn
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !validQuantity}
              className="font-bold gap-1.5 cursor-pointer shadow-2xs"
            >
              <CheckCircle2 size={13} />
              {submitting ? "Processing..." : "Confirm & Update Inventory"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
