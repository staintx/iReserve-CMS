import { AlertTriangle, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import Btn from "./Btn";

export default function ConflictModal({ onClose, onApprove }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><AlertTriangle size={20} className="text-amber-600" /></div>
          <div>
            <p className="font-bold text-foreground">Conflict Detected</p>
            <p className="text-xs text-muted-foreground">System found issues when checking availability</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          {[
            { label: "Venue Availability", status: "conflict", detail: "Manila Hotel Grand Ballroom is booked Sep 18.", alt: "Alternative: Solaire Resort Ballroom" },
            { label: "Staff Availability", status: "ok", detail: "Ana Santos, Marco Cruz available", alt: "" },
            { label: "Inventory Stock", status: "conflict", detail: "White Table Linens: only 2 available (need 30)", alt: "Alternative: Linen House PH restock by Sep 1" },
            { label: "Schedule Overlap", status: "ok", detail: "No overlap detected for kitchen staff", alt: "" },
          ].map(item => (
            <div key={item.label} className={`flex items-start gap-3 p-3 rounded-xl border ${item.status === "ok" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${item.status === "ok" ? "bg-emerald-500" : "bg-red-500"}`}>
                {item.status === "ok" ? <Check size={10} className="text-white" /> : <X size={10} className="text-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
                {item.alt && <p className="text-xs text-primary font-medium mt-0.5">💡 {item.alt}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end flex-wrap">
          <Btn variant="secondary" size="sm" onClick={onClose}>Cancel Booking</Btn>
          <Btn variant="secondary" size="sm" onClick={onClose}>Suggest Dates</Btn>
          <Btn variant="danger" size="sm" onClick={onApprove}>Override & Approve</Btn>
        </div>
      </motion.div>
    </div>
  );
}
