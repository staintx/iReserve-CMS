import React, { useState } from "react";
import { HelpCircle, Check, Utensils, AlertCircle } from "lucide-react";
import { Card, CardContent } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Checkbox } from "../../../../components/ui/checkbox";
import { cn } from "@/lib/utils";
import LiveEstimate from "../components/LiveEstimate";

export default function StepMenuSelection({ form, setForm, menuItems, totalPrice, depositAmount, onNext }) {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", ...new Set(menuItems.map(m => m.category).filter(Boolean))];
  
  const displayedItems = activeCategory === "All" 
    ? menuItems 
    : menuItems.filter(m => m.category === activeCategory);

  const toggleSelection = (item) => {
    const currentSelection = form.selected_menu || [];
    const isSelected = currentSelection.some(m => m._id === item._id);
    
    if (isSelected) {
      setForm({
        ...form,
        selected_menu: currentSelection.filter(m => m._id !== item._id)
      });
    } else {
      setForm({
        ...form,
        selected_menu: [...currentSelection, item]
      });
    }
  };

  const isSelected = (itemId) => form.selected_menu?.some(m => m._id === itemId);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <Card className="flex-1 overflow-hidden border-border bg-card shadow-soft">
        <div className="border-b border-border bg-accent/5 p-6 md:p-8">
          <h2 className="mb-2 text-2xl font-bold text-foreground">Menu Selection</h2>
          <p className="text-sm text-muted-foreground">Choose the dishes you would like to include in your catering.</p>
        </div>

        <CardContent className="space-y-6 p-6 md:p-8">
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-all",
                  activeCategory === cat 
                    ? "bg-accent font-medium text-accent-foreground" 
                    : "border border-border text-muted-foreground hover:border-accent hover:text-accent"
                )}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {displayedItems.map((item) => (
              <div 
                key={item._id} 
                className={cn(
                  "flex flex-col overflow-hidden rounded-2xl border transition-all",
                  isSelected(item._id) ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-accent/50"
                )}
              >
                {item.image_url && (
                  <div className="relative h-32 w-full bg-muted">
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    {isSelected(item._id) && (
                      <div className="absolute right-2 top-2 rounded-full bg-accent p-1 text-accent-foreground shadow-sm">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h4 className="font-semibold text-foreground">{item.name}</h4>
                    <p className="mb-3 mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-accent">
                      {item.price ? `₱${item.price.toLocaleString()}/pax` : "Included"}
                    </span>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                        isSelected(item._id) 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent"
                      )}
                      onClick={() => toggleSelection(item)}
                    >
                      {isSelected(item._id) ? "Selected" : "Select Food"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {displayedItems.length === 0 && (
              <div className="col-span-2 py-8 text-center text-muted-foreground">
                No menu items found for this category.
              </div>
            )}
          </div>

          <div className="border-t border-border pt-6">
            <label className="mb-3 flex cursor-pointer items-center gap-2">
              <Checkbox 
                checked={!!form.special_requests}
                onCheckedChange={(checked) => {
                  if (!checked) {
                    setForm({ ...form, special_requests: "" });
                  } else {
                    setForm({ ...form, special_requests: " " }); // trigger showing the box
                  }
                }}
              />
              <span className="font-medium text-foreground">Other Menu Requests</span>
            </label>
            
            {form.special_requests !== "" && (
              <textarea
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Let us know if you have other menu requests..."
                value={form.special_requests === " " ? "" : form.special_requests}
                onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
              ></textarea>
            )}
          </div>
        </CardContent>
      </Card>

      <LiveEstimate form={form} totalPrice={totalPrice} depositAmount={depositAmount} onNext={onNext} />
    </div>
  );
}
