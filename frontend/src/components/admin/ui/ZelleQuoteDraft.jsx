import React, { useState } from "react";
import { Sparkles, Check, ArrowRight, Package, Plus, DollarSign, HelpCircle, X, CheckCircle2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { getZelleQuotationDraft } from "../../../api/zelle";
import useToast from "../../../hooks/useToast";
import { cn } from "@/lib/utils";

export default function ZelleQuoteDraft({
  inquiryId,
  currentPackageName,
  guestCount,
  onApplyRecommendation,
}) {
  const { notify } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

  const handleFetchRecommendation = async () => {
    if (!inquiryId || isLoading) return;
    setIsLoading(true);
    setIsOpen(true);

    try {
      const data = await getZelleQuotationDraft({
        inquiry_id: inquiryId,
      });

      if (data?.error) {
        notify(data.error, "error");
        setIsOpen(false);
        return;
      }

      setRecommendation(data);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to generate AI quotation recommendation.", "error");
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!recommendation || !onApplyRecommendation) return;
    onApplyRecommendation(recommendation);
    setIsOpen(false);
    notify("AI recommendation applied to quotation form! Please review and adjust as needed.", "success");
  };

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleFetchRecommendation}
        disabled={isLoading || !inquiryId}
        className="h-8 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-500/10 via-primary/10 to-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
      >
        <Sparkles className={cn("w-3.5 h-3.5 text-amber-500", isLoading && "animate-spin")} />
        <span>{isLoading ? "Analyzing Requirements..." : "✨ Zelle Recommendation"}</span>
      </Button>

      {/* Recommendation Modal / Drawer */}
      {isOpen && recommendation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-xl border border-border/80 shadow-2xl p-5 overflow-hidden flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">AI-Assisted Quotation Draft</h3>
                  <p className="text-[11px] text-muted-foreground">Tailored configuration based on inquiry requirements</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-3.5 text-xs">
              {/* Package Recommendation */}
              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col gap-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" /> Recommended Package:
                  </span>
                  <div className="flex items-center gap-1">
                    {recommendation.service_type && (
                      <Badge variant="outline" className="text-[10px] bg-card font-medium text-amber-700 dark:text-amber-300 border-amber-300">
                        {recommendation.service_type}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] bg-card">
                      {recommendation.guest_count} guests
                    </Badge>
                  </div>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <h4 className="font-serif font-bold text-sm text-foreground">{recommendation.recommended_package}</h4>
                  <span className="font-bold text-sm text-primary">
                    ₱{Number(recommendation.estimated_package_cost || 0).toLocaleString()}
                  </span>
                </div>
                {recommendation.inclusions?.length > 0 && (
                  <div className="pt-2 border-t border-border/40 space-y-1">
                    {recommendation.inclusions.slice(0, 4).map((inc, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{inc}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommended Add-ons */}
              {recommendation.recommended_addons?.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-primary" /> Suggested Add-Ons & Enhancements:
                  </span>
                  <div className="space-y-1.5">
                    {recommendation.recommended_addons.map((addon, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/50 text-[11px]">
                        <span className="font-medium">{typeof addon === "string" ? addon : addon.name}</span>
                        <span className="font-bold text-foreground">
                          {typeof addon === "object" && addon.price ? `₱${addon.price.toLocaleString()}` : "Quoted"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Reasoning Notes */}
              {recommendation.admin_notes && (
                <div className="p-3 rounded-2xl bg-muted/60 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground block mb-0.5">💡 Strategy & Notes:</span>
                  {recommendation.admin_notes}
                </div>
              )}

              {/* Total Summary */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 text-white shadow-xs">
                <div>
                  <span className="text-[10px] text-white/70 uppercase tracking-wider block">Estimated Quote Total</span>
                  <span className="font-serif font-bold text-base text-amber-300">
                    ₱{Number(recommendation.estimated_total || recommendation.estimated_package_cost || 0).toLocaleString()}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-400/40">
                  Fits Budget
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                className="flex-1 text-xs h-9 bg-primary text-primary-foreground font-semibold rounded-xl shadow-xs"
                onClick={handleApply}
              >
                Apply to Quotation Form <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-xs h-9 rounded-xl text-muted-foreground"
                onClick={() => setIsOpen(false)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
