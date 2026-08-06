import React from "react";
import { Receipt } from "lucide-react";
import { Card, formatPeso, focusRing } from "./BookingSharedUI";
import { cn } from "@/lib/utils";

const formatCurrency = (value) => formatPeso(value, { decimals: 2 });

export default function LiveEstimate({
  form,
  totalPrice,
  depositAmount,
  depositPercentage,
  selectedPaymentOption,
  setSelectedPaymentOption,
}) {
  const guestCount = parseInt(form.guest_count || "0", 10);

  // Calculate base price dynamically based on selection
  let basePricePerPax = 0;
  if (
    form.service_type === "Food Only" &&
    form.selected_menu &&
    form.selected_menu.length > 0
  ) {
    basePricePerPax = form.selected_menu.reduce(
      (acc, item) => acc + (Number(item.price) || 0),
      0,
    );
  } else if (form.service_type === "Food and Event Setup") {
    // Assuming default custom food & event price per pax is 800 based on previous logic
    basePricePerPax = 800;
  }

  const baseTotal = basePricePerPax * guestCount;
  const displayAmount =
    selectedPaymentOption === "full" ? totalPrice : depositAmount;

  const addonsTotal =
    form.additional_services?.reduce(
      (sum, svc) => sum + Number(svc.price) * Number(svc.quantity || 1),
      0,
    ) || 0;

  const payOption = (value, label) => {
    const checked =
      value === "full"
        ? selectedPaymentOption === "full"
        : selectedPaymentOption !== "full";
    return (
      <label
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors",
          checked
            ? "border-[#4C81E0] bg-[#4C81E0]/5 text-[#1E293B]"
            : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#4C81E0]/40",
        )}
      >
        <input
          type="radio"
          name="pay_option"
          value={value}
          checked={checked}
          onChange={() => setSelectedPaymentOption(value)}
          className={cn("h-4 w-4 accent-[#4C81E0]", focusRing)}
        />
        {label}
      </label>
    );
  };

  return (
    <Card className="p-4 lg:sticky lg:top-[150px]">
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[#1E293B]">
        <Receipt size={14} className="text-[#4C81E0]" />
        Live Estimate
      </h3>

      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
        {payOption("deposit", "Pay deposit")}
        {payOption("full", "Pay full amount")}
      </div>

      <div className="space-y-2 text-[13px]">
        {basePricePerPax > 0 && (
          <div className="flex items-center justify-between gap-3 text-[#64748B]">
            <span className="truncate">
              {guestCount} pax × {formatPeso(basePricePerPax)}
            </span>
            <span className="shrink-0 font-medium text-[#1E293B]">
              {formatCurrency(baseTotal)}
            </span>
          </div>
        )}

        {form.service_type === "Event Setup Only" && (
          <div className="flex items-center justify-between gap-3 text-[#64748B]">
            <span>Event setup</span>
            <span className="shrink-0 font-medium text-[#1E293B]">
              {formatCurrency(totalPrice - addonsTotal)}
            </span>
          </div>
        )}

        {form.additional_services?.map((svc, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 text-[#64748B]"
          >
            <span className="truncate">
              {svc.name}
              {Number(svc.quantity) > 1 ? ` × ${svc.quantity}` : ""}
            </span>
            <span className="shrink-0 font-medium text-[#1E293B]">
              +
              {formatCurrency(
                (Number(svc.price) || 0) * (Number(svc.quantity) || 1),
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-[15px] font-semibold">
        <span className="text-[#1E293B]">Subtotal</span>
        <span className="text-[#4C81E0]">{formatCurrency(totalPrice)}</span>
      </div>

      <p className="mt-1 text-[11px] leading-relaxed text-[#94A3B8]">
        Service fee, transport &amp; taxes are itemized on your quotation.
        <br />
        {depositPercentage}% deposit ≈ {formatCurrency(depositAmount)}
      </p>

      <div className="mt-3 rounded-xl bg-[#1E293B] px-3.5 py-3 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
          {selectedPaymentOption === "full" ? "Total" : "Amount due now"}
        </p>
        <p className="text-xl font-bold tabular-nums">
          {formatCurrency(displayAmount)}
        </p>
      </div>
    </Card>
  );
}
