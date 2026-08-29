import React, { useState, useEffect } from "react";
import { Search, X, Package, Plus, Minus, AlertTriangle, Check, Loader2, Boxes, Filter, RefreshCw } from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../ui/dialog";

export default function AssignEquipmentModal({ booking, open, onClose, onSave }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedQuantities, setSelectedQuantities] = useState({});

  useEffect(() => {
    if (open && booking) {
      loadInventoryAvailability();
    }
  }, [open, booking]);

  const loadInventoryAvailability = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const dateStr = booking.event_date ? new Date(booking.event_date).toISOString().split('T')[0] : "";
      const res = await AdminAPI.getInventoryAvailability(dateStr, booking._id);
      const items = res.data || [];
      setInventoryList(items);

      // Pre-populate selected quantities from current booking inventory_items
      const initialMap = {};
      if (Array.isArray(booking.inventory_items)) {
        booking.inventory_items.forEach(item => {
          const invId = item.inventory_id?._id || item.inventory_id || item._id;
          if (invId) {
            initialMap[invId.toString()] = item.quantity || 0;
          }
        });
      }
      setSelectedQuantities(initialMap);
    } catch (err) {
      notify("Failed to load inventory equipment availability", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (invId, newQty, maxAvailable) => {
    const qty = Math.max(0, parseInt(newQty, 10) || 0);
    if (qty > maxAvailable) {
      notify(`Cannot assign more than ${maxAvailable} available units for this date.`, "error");
    }
    const finalQty = Math.min(qty, maxAvailable);
    setSelectedQuantities(prev => ({
      ...prev,
      [invId]: finalQty
    }));
  };

  const handleStep = (invId, delta, maxAvailable) => {
    const current = selectedQuantities[invId] || 0;
    const next = current + delta;
    if (next > maxAvailable) {
      notify(`Cannot assign more than ${maxAvailable} available units for this date.`, "error");
      return;
    }
    if (next < 0) return;
    setSelectedQuantities(prev => ({
      ...prev,
      [invId]: next
    }));
  };

  const handleSave = async () => {
    if (!booking?._id) return;
    setSaving(true);

    try {
      const payloadItems = Object.entries(selectedQuantities)
        .filter(([_, qty]) => qty > 0)
        .map(([invId, qty]) => {
          const inv = inventoryList.find(i => String(i._id) === String(invId));
          return {
            inventory_id: invId,
            name: inv?.item_name || "Equipment Item",
            quantity: qty
          };
        });

      await AdminAPI.assignEquipment(booking._id, { inventory_items: payloadItems });
      notify("Equipment inventory assigned successfully!", "success");
      if (onSave) onSave();
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to assign equipment inventory", "error");
    } finally {
      setSaving(false);
    }
  };

  // Categories list
  const categories = ["All", ...new Set(inventoryList.map(i => i.category).filter(Boolean))];

  // Filtered items
  const filteredList = inventoryList.filter(item => {
    const matchesSearch = item.item_name?.toLowerCase().includes(search.toLowerCase()) || 
                          item.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalSelectedTypes = Object.values(selectedQuantities).filter(q => q > 0).length;
  const totalSelectedUnits = Object.values(selectedQuantities).reduce((a, b) => a + (Number(b) || 0), 0);

  const eventDateFormatted = booking?.event_date 
    ? new Date(booking.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "TBA";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-card rounded-md border border-border shadow-2xl">
        
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3.5 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8.5 h-8.5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Boxes size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Assign Inventory Equipment
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Booking Reference: <strong className="font-mono text-amber-700">{booking?.reference || `BK-${booking?._id?.substring(0,6)}`}</strong> &bull; Event Date: <strong className="text-foreground">{eventDateFormatted}</strong>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>


        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search equipment by name or category..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
            
            <Btn size="xs" variant="secondary" onClick={loadInventoryAvailability} title="Refresh stock availability">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh Stock
            </Btn>
          </div>

          {/* Category Tabs */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
                <Filter size={11} /> Category:
              </span>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors shrink-0 ${
                    categoryFilter === cat
                      ? "bg-slate-900 text-white font-semibold shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Items List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[300px]">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
              <p className="text-xs text-slate-500">Checking inventory availability for {eventDateFormatted}...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No inventory equipment found</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">Try clearing search filters or add items to your main Inventory catalog first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredList.map(item => {
                const invId = item._id.toString();
                const qty = selectedQuantities[invId] || 0;
                const isSelected = qty > 0;
                const totalStock = item.quantity || 0;
                const availableForDate = item.available_quantity ?? totalStock;
                const reservedByOthers = item.reserved_quantity || 0;
                const isOutOfStock = availableForDate <= 0 && !isSelected;

                return (
                  <div
                    key={invId}
                    className={`p-3.5 rounded-md border transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? "border-amber-400 bg-amber-50/40 ring-1 ring-amber-400/30 shadow-2xs"
                        : isOutOfStock
                        ? "border-slate-100 bg-slate-50 opacity-60"
                        : "border-slate-200 bg-white hover:border-slate-300 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-xs text-slate-900">{item.item_name}</h4>
                          {item.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                              {item.category}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                          <span>Stock: <strong className="text-slate-700">{totalStock}</strong></span>
                          <span>&bull;</span>
                          <span>Available: <strong className={availableForDate > 0 ? "text-emerald-700 font-semibold" : "text-rose-600 font-semibold"}>{availableForDate}</strong></span>
                          {reservedByOthers > 0 && (
                            <>
                              <span>&bull;</span>
                              <span className="text-amber-700" title="Reserved by other bookings on this date">({reservedByOthers} reserved)</span>
                            </>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                    </div>

                    {/* Quantity Selector Stepper */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100/80">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {isSelected ? <span className="text-amber-800 font-bold">Assigned: {qty}</span> : "Quantity to assign:"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={qty <= 0}
                          onClick={() => handleStep(invId, -1, availableForDate + (isSelected ? qty : 0))}
                          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <Minus size={13} />
                        </button>

                        <input
                          type="number"
                          min="0"
                          max={availableForDate + (isSelected ? qty : 0)}
                          value={qty || ""}
                          onChange={e => handleQtyChange(invId, e.target.value, availableForDate + (isSelected ? qty : 0))}
                          placeholder="0"
                          className="w-12 h-7 text-center font-semibold text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                        />

                        <button
                          type="button"
                          disabled={availableForDate <= 0 || (qty >= availableForDate && !isSelected)}
                          onClick={() => handleStep(invId, 1, availableForDate + (isSelected ? qty : 0))}
                          className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-3">
            <div>
              Total Selected: <strong className="text-amber-800 font-bold">{totalSelectedTypes} equipment items</strong> ({totalSelectedUnits} total units)
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Btn variant="secondary" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Btn>
            <Btn variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
              {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : "Save Equipment Assignment"}
            </Btn>
          </div>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
