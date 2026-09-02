import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  PackageCheck,
  AlertTriangle,
  Boxes,
  Sparkles,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText
} from "lucide-react";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import Btn from "./Btn";
import Badge from "./Badge";

export default function VerifyEquipmentReturnsModal({
  booking,
  open,
  onClose,
  onSave
}) {
  const { notify } = useToast();

  const [items, setItems] = useState([]);
  const [chargeCustomer, setChargeCustomer] = useState(false);
  const [damageFee, setDamageFee] = useState(0);
  const [damageReason, setDamageReason] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Initialize equipment return items when modal opens
  useEffect(() => {
    if (!booking) return;

    const inventoryItems = booking.inventory_items || [];
    const returns = booking.equipment_returns || [];

    const initialized = inventoryItems.map((item) => {
      const invId = item.inventory_id?._id || item.inventory_id;
      const returnRec = returns.find(
        (r) => String(r.inventory_id?._id || r.inventory_id) === String(invId)
      );

      const booked = Number(item.quantity || 1);
      const returned = returnRec ? Number(returnRec.quantity_returned ?? booked) : booked;
      const damaged = returnRec ? Number(returnRec.quantity_damaged ?? 0) : 0;
      const notes = returnRec?.notes || "";

      return {
        inventory_id: invId,
        name: item.name || item.inventory_id?.item_name || "Equipment Item",
        category: item.inventory_id?.category || item.category || "Equipment",
        quantity_booked: booked,
        quantity_returned: returned,
        quantity_damaged: damaged,
        notes: notes,
      };
    });

    setItems(initialized);
    setInspectionNotes(booking.equipment_manager_verified?.additional_notes || "");
    setChargeCustomer(false);
    setDamageFee(0);
    setDamageReason("");
  }, [booking, open]);

  // Totals & missing calculation
  const summary = useMemo(() => {
    let totalBooked = 0;
    let totalReturned = 0;
    let totalDamaged = 0;
    let totalMissing = 0;

    items.forEach((item) => {
      const b = Number(item.quantity_booked || 0);
      const r = Number(item.quantity_returned || 0);
      const d = Number(item.quantity_damaged || 0);
      const m = Math.max(0, b - (r + d));

      totalBooked += b;
      totalReturned += r;
      totalDamaged += d;
      totalMissing += m;
    });

    const hasIssues = totalDamaged > 0 || totalMissing > 0;

    return { totalBooked, totalReturned, totalDamaged, totalMissing, hasIssues };
  }, [items]);

  if (!open || !booking) return null;

  const handleQuickMarkClean = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        quantity_returned: item.quantity_booked,
        quantity_damaged: 0,
        notes: "Returned in good condition",
      }))
    );
    setChargeCustomer(false);
    setDamageFee(0);
    setDamageReason("");
    notify("Marked all equipment as clean with zero damage.", "info");
  };

  const updateItemField = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        returns: items.map((i) => ({
          inventory_id: i.inventory_id,
          quantity_returned: Number(i.quantity_returned || 0),
          quantity_damaged: Number(i.quantity_damaged || 0),
          notes: i.notes || "",
        })),
        damage_fee: chargeCustomer ? Number(damageFee || 0) : 0,
        damage_reason: chargeCustomer ? damageReason.trim() : "",
        additional_notes: inspectionNotes.trim(),
      };

      await AdminAPI.verifyEquipmentReturns(booking._id, payload);
      notify("Equipment returns verified and recorded successfully.", "success");
      if (onSave) onSave();
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to verify equipment returns.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const refCode = booking.reference || `BK-${booking._id.substring(0, 8).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                Verify Equipment Returns & Condition
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Booking: <span className="font-mono font-semibold text-slate-700">{refCode}</span> · {booking.event_type}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[calc(85vh-140px)] overflow-y-auto">
            
            {/* Quick Action & Summary Banner */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">Summary:</span>
                <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800 font-bold">
                  {summary.totalBooked} Booked
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  {summary.totalReturned} Good
                </span>
                {summary.totalDamaged > 0 && (
                  <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-800 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {summary.totalDamaged} Damaged
                  </span>
                )}
                {summary.totalMissing > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {summary.totalMissing} Missing
                  </span>
                )}
              </div>

              <Btn
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleQuickMarkClean}
                className="text-xs shrink-0 font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                Mark All Clean (No Damages)
              </Btn>
            </div>

            {/* Inventory Items Inspection List */}
            <div className="space-y-2">
              <label className="font-semibold text-xs text-slate-800 uppercase tracking-wider block">
                Assigned Items Inspection ({items.length})
              </label>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-2 text-center">Booked</th>
                        <th className="py-2.5 px-2 text-center">Good (Returned)</th>
                        <th className="py-2.5 px-2 text-center">Damaged / Broken</th>
                        <th className="py-2.5 px-2 text-center">Missing</th>
                        <th className="py-2.5 px-3">Condition Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => {
                        const booked = Number(item.quantity_booked || 0);
                        const returned = Number(item.quantity_returned || 0);
                        const damaged = Number(item.quantity_damaged || 0);
                        const missing = Math.max(0, booked - (returned + damaged));
                        const hasDamage = damaged > 0;
                        const hasMissing = missing > 0;

                        return (
                          <tr key={idx} className={hasDamage || hasMissing ? "bg-rose-50/40" : "hover:bg-slate-50/50"}>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              <div>{item.name}</div>
                              <span className="text-[10px] text-slate-400 font-normal">{item.category}</span>
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-800">
                              {booked}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={booked}
                                value={item.quantity_returned}
                                onChange={(e) => updateItemField(idx, "quantity_returned", Number(e.target.value))}
                                className="w-16 h-7 text-center rounded border border-slate-300 font-semibold text-emerald-800 bg-white focus:border-amber-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={booked}
                                value={item.quantity_damaged}
                                onChange={(e) => updateItemField(idx, "quantity_damaged", Number(e.target.value))}
                                className={`w-16 h-7 text-center rounded border font-semibold bg-white focus:outline-none ${
                                  hasDamage ? "border-rose-400 text-rose-700 bg-rose-50/50" : "border-slate-300 text-slate-700"
                                }`}
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span
                                className={`inline-block font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                                  hasMissing ? "bg-amber-100 text-amber-900 border border-amber-200" : "text-slate-400"
                                }`}
                              >
                                {missing}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={item.notes}
                                onChange={(e) => updateItemField(idx, "notes", e.target.value)}
                                placeholder="e.g. Scratched, 1 glass cracked..."
                                className="w-full h-7 px-2 text-xs rounded border border-slate-200 bg-white focus:border-amber-500 focus:outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Damage Fee Billing to Customer Section */}
            <div className={`p-4 rounded-lg border transition-all ${
              chargeCustomer ? "bg-amber-50/60 border-amber-300" : "bg-slate-50/50 border-slate-200"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="chargeCustomerCheck"
                    checked={chargeCustomer}
                    onChange={(e) => setChargeCustomer(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="chargeCustomerCheck" className="font-bold text-xs text-slate-900 cursor-pointer flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-amber-600" />
                      Charge Equipment Damage / Replacement Fee to Customer
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Adds an itemized damage surcharge to the customer's invoice with online payment capability.
                    </p>
                  </div>
                </div>
              </div>

              {chargeCustomer && (
                <div className="mt-3.5 pt-3.5 border-t border-amber-200/80 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Damage Fee Amount (₱) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required={chargeCustomer}
                        value={damageFee || ""}
                        onChange={(e) => setDamageFee(Number(e.target.value))}
                        placeholder="e.g. 1500"
                        className="w-full h-8 px-3 text-xs rounded-md border border-slate-300 bg-white font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Invoice Description / Breakdown <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required={chargeCustomer}
                        value={damageReason}
                        onChange={(e) => setDamageReason(e.target.value)}
                        placeholder="e.g. 2 Broken Crystal Goblets & 1 Burnt Table Runner"
                        className="w-full h-8 px-3 text-xs rounded-md border border-slate-300 bg-white text-slate-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {damageFee > 0 && (
                    <div className="p-3 bg-white rounded-md border border-amber-200 text-xs flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-600">
                        Original Total: <strong>₱{(booking.total_price || 0).toLocaleString()}</strong>
                      </span>
                      <span className="text-amber-800 font-semibold">
                        + Damage Fee: <strong>₱{Number(damageFee).toLocaleString()}</strong>
                      </span>
                      <span className="text-slate-900 font-bold">
                        New Booking Total: <strong>₱{((booking.total_price || 0) + Number(damageFee)).toLocaleString()}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* General Inspection Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block" htmlFor="inspection-notes">
                General Return & Inspection Notes (Optional)
              </label>
              <textarea
                id="inspection-notes"
                rows={2}
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="Log any warehouse handling notes, cleaning requirements, or driver delivery notes..."
                className="w-full p-2.5 text-xs rounded-md border border-slate-300 bg-white text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/80">
            <Btn type="button" variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Btn>
            <Btn
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || (chargeCustomer && (!damageFee || !damageReason.trim()))}
              className="font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-2xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? "Saving Verification..." : "Save & Confirm Return Verification"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

