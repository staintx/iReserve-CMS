import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import StatusPill from "./StatusPill";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatShortDate } from "../../../utils/format";

export default function CustomerDateEventsModal({
  isOpen,
  onClose,
  selectedDate,
  events = [],
}) {
  const formattedDateTitle = selectedDate
    ? selectedDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Selected Date";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="space-y-1.5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-[#2C4B8A]" />
            <span>Date Details</span>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 font-sans">
            {formattedDateTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {events.length > 0
              ? `${events.length} event${events.length > 1 ? "s" : ""} or reminder${events.length > 1 ? "s" : ""} scheduled for this date`
              : "No activities scheduled"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3.5">
          {events.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">
                No bookings or reminders for this date.
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                You can inquire or request a quotation for this date at any time.
              </p>
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id || `${event.type}-${event.reference || Math.random()}`}
                className={cn(
                  "rounded-xl border p-4 sm:p-5 transition-all space-y-3 shadow-2xs",
                  event.type === "confirmed" && "border-emerald-200 bg-emerald-50/30",
                  event.type === "inquiry" && "border-amber-200 bg-amber-50/30",
                  event.type === "payment_due" && "border-blue-200 bg-blue-50/30",
                  event.type === "overdue_payment" && "border-rose-200 bg-rose-50/30",
                  event.type === "completed" && "border-slate-200 bg-slate-50/40"
                )}
              >
                {/* Header: Event Type Badge & Status Pill */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        event.type === "confirmed" && "bg-emerald-500",
                        event.type === "inquiry" && "bg-orange-500",
                        event.type === "payment_due" && "bg-blue-600",
                        event.type === "overdue_payment" && "bg-rose-600 animate-pulse",
                        event.type === "completed" && "bg-slate-400"
                      )}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      {event.categoryLabel}
                    </span>
                  </div>

                  {event.statusPill && (
                    <StatusPill
                      tone={event.statusPill.tone}
                      label={event.statusPill.label}
                      icon={event.statusPill.icon}
                    />
                  )}
                </div>

                {/* Event Main Title */}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {event.title}
                  </h3>
                  {event.subtitle && (
                    <p className="text-xs text-slate-500 mt-0.5">{event.subtitle}</p>
                  )}
                </div>

                {/* Content details depending on event type */}
                {event.type === "payment_due" || event.type === "overdue_payment" ? (
                  <div className="bg-white/80 rounded-lg p-3 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Remaining balance:</span>
                      <span className="text-base font-bold text-slate-900 tabular-nums">
                        {formatCurrency(event.balance)}
                      </span>
                    </div>
                    {event.dueDate && (
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Due date:</span>
                        <span className="font-semibold text-slate-700">{event.dueDate}</span>
                      </div>
                    )}
                    {event.reference && (
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Booking Reference:</span>
                        <span className="font-mono font-medium text-slate-700">{event.reference}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs bg-white/70 rounded-lg p-3 border border-slate-200/70">
                    {event.time && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{event.time}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    {event.guests && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{event.guests} guests</span>
                      </div>
                    )}
                    {event.reference && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span className="text-slate-400 font-medium">Ref:</span>
                        <span className="font-mono font-semibold">{event.reference}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Smart Action Button */}
                {event.onAction && (
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      onClick={() => {
                        onClose();
                        event.onAction();
                      }}
                      className={cn(
                        "text-xs font-semibold px-4 h-8 rounded-md transition-all shadow-2xs gap-1.5 cursor-pointer",
                        (event.type === "payment_due" || event.type === "overdue_payment")
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-[#2C4B8A] hover:bg-[#1E3563] text-white"
                      )}
                    >
                      {event.type === "payment_due" || event.type === "overdue_payment" ? (
                        <CreditCard className="w-3.5 h-3.5" />
                      ) : null}
                      <span>{event.actionText || "View Details"}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
