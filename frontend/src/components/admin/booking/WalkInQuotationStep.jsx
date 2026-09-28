import React, { useState } from "react";
import {
  Plus,
  Trash2,
  DollarSign,
  Package,
  Utensils,
  Sparkles,
  Layers,
  HelpCircle,
  Percent,
  CheckCircle2,
  AlertCircle,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { formatCurrency } from "../../../utils/format";
import { cn } from "@/lib/utils";

const COMMON_UNITS = ["Pax", "Bilao", "Tray", "Setup", "Lot", "Set", "Hour", "pcs", "Serving"];

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
        value={value === 0 ? "0" : value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border border-slate-300 bg-white pl-6 pr-2.5 py-1.5 text-xs text-slate-900 font-mono font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-400",
          className
        )}
      />
    </div>
  );
}

export default function WalkInQuotationStep({
  quotationItems = [],
  setQuotationItems,
  discount,
  setDiscount,
  depositPercent = 20,
  setDepositPercent,
  customDeposit,
  setCustomDeposit,
  paymentMethod = "cash",
  setPaymentMethod,
  depositPaidImmediately = true,
  setDepositPaidImmediately,
  balancePreference = "in_person",
  setBalancePreference,
  notes = "",
  setNotes,
  onResetToDefault,
  guestCount = 1,
  packageName = "",
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    description: "",
    quantity: 1,
    unit: "Lot",
    unitPrice: "",
  });

  // Calculate Subtotals & Totals
  const subtotal = quotationItems.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unitPrice) || 0;
    return sum + q * p;
  }, 0);

  const numDiscount = Number(discount) || 0;
  const grandTotal = Math.max(0, subtotal - numDiscount);

  const depositAmount =
    customDeposit !== "" && customDeposit !== undefined
      ? Math.min(grandTotal, Math.max(0, Number(customDeposit) || 0))
      : Math.round(grandTotal * (Number(depositPercent || 20) / 100));

  const remainingBalance = Math.max(0, grandTotal - depositAmount);

  // Update item fields
  const handleItemChange = (index, field, value) => {
    setQuotationItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Remove item
  const handleRemoveItem = (index) => {
    setQuotationItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Add custom item
  const handleAddCustomItem = (e) => {
    e?.preventDefault();
    if (!newItem.name.trim()) return;

    const itemToAdd = {
      key: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newItem.name.trim(),
      description: newItem.description.trim() || "Custom service / item",
      category: "Custom",
      quantity: Math.max(1, Number(newItem.quantity) || 1),
      unit: newItem.unit || "Lot",
      unitPrice: Number(newItem.unitPrice) || 0,
      isCustom: true,
    };

    setQuotationItems((prev) => [...prev, itemToAdd]);
    setNewItem({
      name: "",
      description: "",
      quantity: 1,
      unit: "Lot",
      unitPrice: "",
    });
    setShowAddModal(false);
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case "Package":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Menu":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Add-on":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Equipment":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Quotation &amp; Pricing
            </h2>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Walk-in Quotation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign prices, review quantities, and configure payment terms for all selected client services.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onResetToDefault && (
            <button
              type="button"
              onClick={onResetToDefault}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
              title="Reset quotation line items from selected services"
            >
              <RotateCcw size={13} /> Reset to Defaults
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus size={14} /> Add Line Item
          </button>
        </div>
      </div>

      {/* ── Quotation Items Table / Cards ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={15} className="text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Itemized Quotation Lines ({quotationItems.length})
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Computed Subtotal: <strong className="text-slate-900 font-mono">{formatCurrency(subtotal)}</strong>
          </span>
        </div>

        {quotationItems.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Receipt size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No quotation line items yet</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Items from your previous selections or custom items added will appear here.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
            >
              <Plus size={13} /> Add First Item
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {/* Table Header — Desktop */}
            <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <div className="col-span-5">Item / Service Details</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-center">Unit</div>
              <div className="col-span-2 text-right">Unit Price (₱)</div>
              <div className="col-span-1 text-right">Subtotal</div>
            </div>

            {/* Item Rows */}
            {quotationItems.map((item, idx) => {
              const itemQty = Number(item.quantity) || 0;
              const itemPrice = Number(item.unitPrice) || 0;
              const lineSubtotal = itemQty * itemPrice;

              return (
                <div
                  key={item.key || `qi-${idx}`}
                  className="p-3.5 sm:px-4 sm:py-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 items-center">
                    {/* Item & Description */}
                    <div className="md:col-span-5 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border shrink-0",
                            getCategoryBadge(item.category)
                          )}
                        >
                          {item.category || "Item"}
                        </span>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                          className="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none hover:bg-white hover:ring-1 hover:ring-slate-300 rounded px-1 transition-all"
                          placeholder="Item Name"
                        />
                      </div>
                      <input
                        type="text"
                        value={item.description || ""}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        className="w-full text-[11px] text-slate-500 bg-transparent border-0 p-0 focus:ring-0 focus:outline-none hover:bg-white hover:ring-1 hover:ring-slate-300 rounded px-1 transition-all truncate"
                        placeholder="Description / specification"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-between md:justify-center md:col-span-2">
                      <span className="md:hidden text-xs text-slate-500 font-medium">Quantity:</span>
                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity === 0 ? "0" : item.quantity || ""}
                          onChange={(e) =>
                            handleItemChange(idx, "quantity", Math.max(1, Number(e.target.value) || 1))
                          }
                          className="w-full text-center rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Unit */}
                    <div className="flex items-center justify-between md:justify-center md:col-span-2">
                      <span className="md:hidden text-xs text-slate-500 font-medium">Unit:</span>
                      <div className="w-24">
                        <select
                          value={item.unit || "Pax"}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                        >
                          {COMMON_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="flex items-center justify-between md:justify-end md:col-span-2">
                      <span className="md:hidden text-xs text-slate-500 font-medium">Unit Price:</span>
                      <div className="w-28">
                        <MoneyInput
                          value={item.unitPrice}
                          onChange={(val) => handleItemChange(idx, "unitPrice", val)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Subtotal & Action */}
                    <div className="flex items-center justify-between md:justify-end md:col-span-1 gap-2 pt-1 md:pt-0 border-t md:border-0 border-slate-100">
                      <span className="md:hidden text-xs font-bold text-slate-700">Subtotal:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
                          {formatCurrency(lineSubtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50 cursor-pointer"
                          title="Remove item from quotation"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Financial Summary & Calculation Grid ── */}
      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/25 p-4 sm:p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Financial Breakdown &amp; Balance Summary
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Subtotal */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quotation Subtotal
            </span>
            <p className="text-base sm:text-lg font-bold text-slate-800 tabular-nums mt-0.5">
              {formatCurrency(subtotal)}
            </p>
          </div>

          {/* Discount Field */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Discount (Optional)
            </span>
            <div className="mt-1">
              <MoneyInput
                value={discount}
                onChange={setDiscount}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Grand Total */}
          <div className="rounded-xl border border-blue-300 bg-blue-50/80 p-3.5 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Grand Total Price
            </span>
            <p className="text-base sm:text-lg font-extrabold text-blue-900 tabular-nums mt-0.5">
              {formatCurrency(grandTotal)}
            </p>
          </div>

          {/* Deposit Required */}
          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Deposit Due
              </span>
              <div className="flex items-center gap-1">
                {[20, 30, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setDepositPercent(pct);
                      setCustomDeposit("");
                    }}
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer",
                      depositPercent === pct && customDeposit === ""
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-800 tabular-nums mt-0.5">
              {formatCurrency(depositAmount)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Remaining: <strong className="text-slate-700 tabular-nums">{formatCurrency(remainingBalance)}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ── Payment & Reservation Terms ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
          Payment Method &amp; Confirmation Settings
        </h3>

        {/* Payment Method Grid */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-2">
            Client Payment Method
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "cash", label: "Cash" },
              { id: "gcash", label: "GCash" },
              { id: "bank", label: "Bank Transfer" },
              { id: "paymongo", label: "PayMongo" },
            ].map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setPaymentMethod(pm.id)}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer",
                  paymentMethod === pm.id
                    ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/10 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Deposit Paid Toggle */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-3.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-800">
              Collect Deposit Immediately
            </p>
            <p className="text-[11px] text-slate-500">
              Mark this walk-in client’s deposit of {formatCurrency(depositAmount)} as paid upon booking creation.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={depositPaidImmediately}
              onChange={(e) => setDepositPaidImmediately(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Balance Payment Preference */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Remaining Balance Payment Preference
          </label>
          <select
            value={balancePreference || "in_person"}
            onChange={(e) => setBalancePreference?.(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            <option value="in_person">In Person / On Event Day</option>
            <option value="online">Online (GCash / Bank Transfer / PayMongo)</option>
            <option value="unselected">Not Selected</option>
          </select>
        </div>

        {/* Quotation / Payment Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Quotation &amp; Payment Remarks (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Receipt #1042, Client paid ₱3,500 down payment via GCash ref #82941"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* ── Modal for Adding Custom Line Item ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Add Quotation Line Item</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item or Service Name *
                </label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Delivery & Logistics, Host / Emcee, Additional Bilao"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Specification
                </label>
                <input
                  type="text"
                  value={newItem.description}
                  onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                  placeholder="e.g. 2 hours program hosting, Transport outside Batangas"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Qty *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newItem.quantity}
                    onChange={(e) =>
                      setNewItem((p) => ({
                        ...p,
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={newItem.unit}
                    onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unit Price (₱) *
                  </label>
                  <MoneyInput
                    value={newItem.unitPrice}
                    onChange={(val) => setNewItem((p) => ({ ...p, unitPrice: val }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Subtotal preview */}
              <div className="rounded-lg bg-blue-50 p-2.5 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Computed Line Subtotal:</span>
                <strong className="text-blue-800 font-bold tabular-nums">
                  {formatCurrency((Number(newItem.quantity) || 1) * (Number(newItem.unitPrice) || 0))}
                </strong>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
