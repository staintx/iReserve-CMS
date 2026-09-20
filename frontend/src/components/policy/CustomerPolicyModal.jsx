import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import PolicyRenderer from "./PolicyRenderer";
import { DEFAULT_POLICIES } from "./defaultPolicies";
import { formatPolicyDate } from "./policyFormat";
import useBusinessInfo from "../../hooks/useBusinessInfo";
import { CustomerAPI } from "../../api/customer";
import { X } from "lucide-react";

export default function CustomerPolicyModal({
  open,
  onClose,
  initialPolicy = "terms", // "terms" | "privacy" | "cancellation"
  policyKey,
  businessInfo: providedBusinessInfo = null,
}) {
  const [liveBusinessInfo, setLiveBusinessInfo] = useState(null);

  useEffect(() => {
    if (open) {
      CustomerAPI.getBusinessInfo()
        .then((res) => {
          if (res?.data) {
            setLiveBusinessInfo(res.data);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const fetchedBusinessInfo = useBusinessInfo(providedBusinessInfo);
  const businessInfo = liveBusinessInfo || providedBusinessInfo || fetchedBusinessInfo || {};

  // Resolve target policy key (supports policyKey or initialPolicy)
  const targetKey = policyKey || initialPolicy || "terms";

  const policies = businessInfo?.policies || DEFAULT_POLICIES;
  const currentPolicyData = policies[targetKey] || DEFAULT_POLICIES[targetKey] || {};
  const currentContent = currentPolicyData.content || DEFAULT_POLICIES[targetKey]?.content || "";
  const currentTitle = currentPolicyData.title || DEFAULT_POLICIES[targetKey]?.title || "Policy";

  const businessName = businessInfo.business_name || "Caezelle's Food, Catering & Services";

  // Human-readable last-updated date
  const updatedDate =
    formatPolicyDate(currentPolicyData?.updated_at || currentPolicyData?.published_at) ||
    null;

  // Short, plain-language description for each policy
  const description = useMemo(() => {
    switch (targetKey) {
      case "privacy":
        return "How we collect and use your information";
      case "cancellation":
        return "Refund and rescheduling guidelines";
      case "terms":
      default:
        return "Your agreement with us for event services";
    }
  }, [targetKey]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        hideClose={true}
        className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden border border-slate-200 shadow-2xl bg-white font-sans text-slate-800 rounded-xl"
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 bg-white text-left shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5 min-w-0">
              {/* Business name */}
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase truncate">
                {businessName}
              </p>

              {/* Policy title */}
              <DialogTitle className="font-sans text-xl font-bold text-slate-900 tracking-tight leading-snug">
                {currentTitle}
              </DialogTitle>

              {/* Short human description */}
              <p className="text-sm text-slate-500 leading-normal">
                {description}
              </p>

              {/* Last updated — only metadata we keep */}
              {updatedDate && (
                <p className="text-xs text-slate-400 pt-0.5">
                  Last updated:{" "}
                  <span className="font-medium text-slate-500">{updatedDate}</span>
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer shrink-0 mt-0.5"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable policy content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 bg-white">
          <PolicyRenderer content={currentContent} />
        </div>

        {/* Footer — simple Close only */}
        <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-slate-700 border-slate-200 hover:bg-slate-100 text-xs font-semibold px-5 cursor-pointer transition-colors"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
