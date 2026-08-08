import React, { useState, useEffect } from "react";
import Modal from "../../common/Modal";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import { Calculator, Save, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { diffQuotationVersions } from "../../../utils/quotationDiff";

export default function QuotationBuilderModal({ inquiry, onClose, onSuccess }) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quotation, setQuotation] = useState(null);

  // Form State
  const [packagePrice, setPackagePrice] = useState(0);
  const [menuItems, setMenuItems] = useState([]);
  const [addOns, setAddOns] = useState([]);
  const [transportationFee, setTransportationFee] = useState(0);
  const [equipmentFee, setEquipmentFee] = useState(0);
  const [decorationFee, setDecorationFee] = useState(0);
  const [taxes, setTaxes] = useState(0);
  const [discounts, setDiscounts] = useState(0);
  const [adminNotes, setAdminNotes] = useState("");
  const [depositAmount, setDepositAmount] = useState(0);

  // Service Type Conditions
  const eventType = inquiry?.event_type?.toLowerCase() || "";
  const isFoodOnly = eventType.includes("food delivery") || eventType === "food only";
  const isSetupOnly = eventType.includes("setup only");

  useEffect(() => {
    // Check if quotation already exists for version tracking
    AdminAPI.getQuotationsByInquiry(inquiry._id)
      .then((res) => {
        const quotes = res.data;
        if (quotes && quotes.length > 0) {
          // Load latest quote values
          const latest = quotes[0];
          setQuotation(latest);
          setPackagePrice(latest.package_id ? (latest.subtotal - latest.transportation_fee /* rough estimation, real logic below */) : 0);
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
          // Initialize from Inquiry
          if (inquiry.selected_menu) {
            setMenuItems(inquiry.selected_menu.map(m => ({ name: m.name, price: m.price || 0, note: "" })));
          }
          if (inquiry.service_items) {
            setAddOns(inquiry.service_items.map(s => ({ name: s.name, price: s.price || 0, quantity: s.quantity || 1 })));
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load quotations:", err);
      })
      .finally(() => setLoading(false));
  }, [inquiry]);

  const guestCount = Number(inquiry.guest_count) || 1;

  const handleMenuChange = (index, field, value) => {
    const newItems = [...menuItems];
    newItems[index][field] = value;
    setMenuItems(newItems);
  };

  const handleAddOnChange = (index, field, value) => {
    const newItems = [...addOns];
    newItems[index][field] = value;
    setAddOns(newItems);
  };

  const menuSubtotal = menuItems.reduce((acc, item) => acc + (Number(item.price) * guestCount), 0);
  const addOnsSubtotal = addOns.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

  const subtotal = 
    Number(packagePrice) + 
    menuSubtotal +
    addOnsSubtotal +
    Number(transportationFee) +
    Number(equipmentFee) +
    Number(decorationFee);

  const totalCost = subtotal + Number(taxes) - Number(discounts);
  const remainingBalance = totalCost - Number(depositAmount);

  // The version about to be saved. Used both for the pre-send change summary
  // and as the submit payload, so what the admin reviews is exactly what ships.
  const draft = {
    inquiry_id: inquiry._id,
    package_id: inquiry.package_id?._id,
    package_name: inquiry.package_id?.name,
    guest_count: inquiry.guest_count,
    menu_items: menuItems,
    add_ons: addOns,
    transportation_fee: Number(transportationFee),
    equipment_fee: Number(equipmentFee),
    decoration_fee: Number(decorationFee),
    taxes: Number(taxes),
    discounts: Number(discounts),
    subtotal,
    total_cost: totalCost,
    deposit_amount: Number(depositAmount),
    remaining_balance: remainingBalance,
    admin_notes: adminNotes
  };

  // Only meaningful when revising: compares the draft against the latest
  // saved version using the same helper the customer's "what changed" view uses.
  const pendingChanges = quotation ? diffQuotationVersions(quotation, draft) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = draft;

    try {
      await AdminAPI.createQuotation(payload);
      notify("Quotation generated successfully!", "success");
      onSuccess();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to generate quotation.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Modal title="Quotation Builder" onClose={onClose} className="max-w-4xl h-[80vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
      </Modal>
    );
  }

  return (
    <Modal title="Quotation Builder" onClose={onClose} className="max-w-7xl w-[95vw] h-[88vh]">
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-8 h-full overflow-hidden">
        
        {/* Left Side: Form Fields (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-6 space-y-8 pb-10">
          {quotation && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg flex items-center gap-2 text-sm font-medium">
              <AlertCircle size={16} />
              Editing existing Quotation. This will create Version {quotation.version_number + 1}.
            </div>
          )}

          {/* Pricing Sections */}
          {!isFoodOnly && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Base Pricing</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1.5">Package Price (₱)</label>
                  <input type="number" value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-shadow" />
                </div>
              </div>
            </div>
          )}

          {!isSetupOnly && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-slate-800 text-lg">Menu Items</h3>
                <span className="text-xs font-semibold bg-powder text-primary px-3 py-1 rounded-full border border-primary/20">
                  {guestCount} Pax Guest Count
                </span>
              </div>
              {menuItems.length === 0 && <p className="text-sm text-slate-400 italic">No menu items selected.</p>}
              {menuItems.map((item, idx) => {
                const itemTotal = (Number(item.price) || 0) * guestCount;
                return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
                    <input 
                      type="text" 
                      value={item.name} 
                      onChange={(e) => handleMenuChange(idx, "name", e.target.value)} 
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow" 
                      placeholder="Item Name" 
                    />
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">₱</span>
                        <input 
                          type="number" 
                          value={item.price} 
                          onChange={(e) => handleMenuChange(idx, "price", e.target.value)} 
                          className="w-32 pl-7 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow" 
                          placeholder="Price / pax" 
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-500 min-w-24 text-right">
                        = ₱{itemTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isFoodOnly && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Add-ons & Services</h3>
              {addOns.length === 0 && <p className="text-sm text-slate-400 italic">No add-ons selected.</p>}
              {addOns.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
                  <input type="text" value={item.name} onChange={(e) => handleAddOnChange(idx, "name", e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow" placeholder="Add-on Name" />
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">x</span>
                    <input type="number" value={item.quantity} onChange={(e) => handleAddOnChange(idx, "quantity", e.target.value)} className="w-24 pl-7 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow" placeholder="Qty" />
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">₱</span>
                    <input type="number" value={item.price} onChange={(e) => handleAddOnChange(idx, "price", e.target.value)} className="w-32 pl-7 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow" placeholder="Price" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Additional Fees</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Transportation (₱)</label>
                <input type="number" value={transportationFee} onChange={(e) => setTransportationFee(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow" />
              </div>
              {!isFoodOnly && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Equipment (₱)</label>
                    <input type="number" value={equipmentFee} onChange={(e) => setEquipmentFee(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Decoration (₱)</label>
                    <input type="number" value={decorationFee} onChange={(e) => setDecorationFee(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow" />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Adjustments</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Taxes (₱)</label>
                <input type="number" value={taxes} onChange={(e) => setTaxes(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Discounts (₱)</label>
                <input type="number" value={discounts} onChange={(e) => setDiscounts(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Payment Terms</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">Required Deposit (₱)</label>
                <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-lg border-b pb-2">Notes</h3>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Notes for Customer</label>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows="3" className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm transition-shadow"></textarea>
          </div>
        </div>

        {/* Right Side: Summary Panel (Sticky) */}
        <div className="w-full md:w-96 bg-slate-900 text-white p-6 rounded-xl shadow-2xl flex flex-col h-full max-h-full overflow-y-auto shrink-0 border border-slate-800">
          <div className="flex items-center gap-2 text-accent font-bold text-lg mb-4 pb-3 border-b border-white/10">
            <Calculator size={20} /> Quote Summary
          </div>
          
          <div className="space-y-3 flex-1 mb-6 text-sm">
            {!isSetupOnly && menuItems.length > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Food ({guestCount} pax)</span>
                <span>₱{menuSubtotal.toFixed(2)}</span>
              </div>
            )}
            {!isFoodOnly && addOns.length > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Add-ons & Services</span>
                <span>₱{addOnsSubtotal.toFixed(2)}</span>
              </div>
            )}
            {(Number(transportationFee) > 0 || Number(equipmentFee) > 0 || Number(decorationFee) > 0) && (
              <div className="flex justify-between text-slate-300">
                <span>Additional Fees</span>
                <span>₱{(Number(transportationFee) + Number(equipmentFee) + Number(decorationFee)).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-200 font-semibold border-t border-white/10 pt-2 mt-2">
              <span>Subtotal</span>
              <span>₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Taxes</span>
              <span>+ ₱{Number(taxes).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Discounts</span>
              <span>- ₱{Number(discounts).toFixed(2)}</span>
            </div>
            <div className="pt-4 mt-4 border-t border-white/10 flex justify-between font-bold text-lg">
              <span>Total Cost</span>
              <span className="text-emerald-400">₱{totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-xs mt-2">
              <span>Required Deposit</span>
              <span>₱{Number(depositAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-xs">
              <span>Remaining Balance</span>
              <span>₱{remainingBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Pre-send review: exactly what the customer will see as
              "what changed", computed from the draft vs the last saved version. */}
          {quotation && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={14} className="text-amber-300 shrink-0" />
                <span className="text-xs font-bold text-white">
                  Changes to Version {(Number(quotation.version_number) || 1) + 1}.0
                </span>
              </div>

              {pendingChanges.length === 0 ? (
                <p className="text-xs text-slate-400 leading-relaxed">
                  Nothing has changed yet. Adjust the quotation before sending a new version.
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
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

              <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                This is what the customer will see as the changes in this version.
              </p>
            </div>
          )}

          {/* Pinned so the send action stays reachable now that the change
              summary can make this column scroll. */}
          <div className="sticky bottom-0 -mx-6 mt-auto flex flex-col gap-3 border-t border-white/10 bg-slate-900 px-6 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
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
