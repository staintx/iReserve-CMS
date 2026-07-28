import React from "react";
import { PackageOpen, Info, Plus, Minus } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui/card";
import { cn } from "@/lib/utils";

export default function StepEquipmentSelection({ form, setForm, inventoryItems }) {
  const getSelectedQuantity = (itemId) => {
    const found = form.additional_services.find(s => s.item_id === itemId);
    return found ? found.quantity : 0;
  };

  const handleQuantityChange = (item, delta) => {
    setForm(prev => {
      const existingServices = [...(prev.additional_services || [])];
      const index = existingServices.findIndex(s => s.item_id === item._id);
      
      if (index >= 0) {
        const newQty = Math.max(0, existingServices[index].quantity + delta);
        if (newQty === 0) {
          existingServices.splice(index, 1);
        } else {
          existingServices[index].quantity = newQty;
        }
      } else if (delta > 0) {
        existingServices.push({
          item_id: item._id,
          name: item.item_name,
          price: item.rental_price,
          quantity: delta
        });
      }

      return { ...prev, additional_services: existingServices };
    });
  };

  const decorOptions = [
    "Floral Arrangements",
    "Stage Backdrop",
    "Red Carpet",
    "Draping & Ceiling Decor",
    "Centerpieces"
  ];

  const toggleDecor = (decor) => {
    setForm(prev => {
      const current = prev.special_requests || "";
      const currentArr = current.split(', ').filter(Boolean);
      
      const updated = currentArr.includes(decor)
        ? currentArr.filter(d => d !== decor)
        : [...currentArr, decor];
        
      return { ...prev, special_requests: updated.join(', ') };
    });
  };

  const currentDecor = form.special_requests ? form.special_requests.split(', ') : [];

  return (
    <Card className="overflow-hidden border-border bg-card shadow-soft">
      <div className="border-b border-border p-6 md:p-8">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Equipment & Decor</h2>
        <p className="text-sm text-muted-foreground">Select the equipment and add-on services you need for your event.</p>
      </div>

      <CardContent className="space-y-8 p-6 md:p-8">
        {inventoryItems && inventoryItems.length > 0 ? (
          <div>
            <h3 className="mb-4 border-b border-border pb-2 text-sm font-semibold uppercase tracking-wider text-foreground">Available Equipment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inventoryItems.map((item) => {
                const qty = getSelectedQuantity(item._id);
                return (
                  <div 
                    key={item._id} 
                    className={cn(
                      "flex flex-col justify-between rounded-xl border p-4 transition-all",
                      qty > 0 ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border bg-background"
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-foreground">{item.item_name}</h4>
                        <p className="text-sm text-muted-foreground">₱{item.rental_price?.toLocaleString() || 0} / unit</p>
                      </div>
                      <PackageOpen className={cn("w-5 h-5", qty > 0 ? "text-accent" : "text-muted-foreground")} />
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm font-medium text-muted-foreground">Quantity</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          disabled={qty === 0}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-semibold">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            <Info className="mx-auto mb-2 h-6 w-6 opacity-50" />
            <p>No equipment inventory currently available.</p>
          </div>
        )}

        <div>
          <h3 className="mb-4 border-b border-border pb-2 text-sm font-semibold uppercase tracking-wider text-foreground">Decor & Theme Preferences</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {decorOptions.map((item) => (
              <label key={item} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  checked={currentDecor.includes(item)}
                  onChange={() => toggleDecor(item)}
                />
                <span className="text-sm font-medium">{item}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">Selected decor will be added to your special requests for coordination.</p>
        </div>

      </CardContent>
    </Card>
  );
}
