import {
  Receipt,
  CreditCard,
  Banknote,
  ShieldCheck,
  Calendar,
  Truck,
  Store,
} from "lucide-react";
import { SH } from "../components/BookingSharedUI";

export default function StepCostSummary({
  form,
  initialPackageName,
  initialPackagePrice,
  totalPrice,
  depositAmount,
  depositPercentage,
}) {
  const guestCount = parseInt(form.guest_count || "0", 10);
  const additionalServicesTotal =
    form.additional_services?.reduce(
      (acc, svc) => acc + Number(svc.price || 0) * Number(svc.quantity || 1),
      0,
    ) || 0;
  const baseTotalAmount = totalPrice - additionalServicesTotal;
  const isCustom = !initialPackageName;
  const displayName = isCustom ? "Custom Booking" : initialPackageName;
  const remainingBalance = totalPrice - depositAmount;

  // Check delivery method from form
  const isDelivery = form.delivery_method !== "pickup";
  const isPickup = form.delivery_method === "pickup";

  const getBasePriceDescription = () => {
    if (!isCustom)
      return `₱${(initialPackagePrice || 0).toLocaleString()} x ${guestCount} guests`;
    if (form.service_type === "Event Setup Only")
      return "Fixed price base setup";
    if (form.service_type === "Food and Event Setup")
      return `Estimated setup & catering base for ${guestCount} guests`;
    if (form.service_type === "Food Only") {
      if (form.selected_menu && form.selected_menu.length > 0) {
        return `Custom menu selection for ${guestCount} guests`;
      }
    }
    return `Estimated catering base for ${guestCount} guests`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <SH
        title="Cost Summary"
        sub="Review your package breakdown and payment details."
      />

      <div className="bg-white rounded-2xl border border-black/[0.08] p-6 sm:p-8 shadow-sm">
        {/* Main Booking Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#F7F4EE] rounded-xl p-5 mb-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E] mb-1">
              Package
            </p>
            <p className="font-semibold text-[#111]">{displayName}</p>
            {isCustom && (
              <p className="text-[10px] text-[#6B6657]">{form.service_type}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E] mb-1">
              Guests
            </p>
            <p className="font-semibold text-[#111]">{guestCount}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E] mb-1">
              Date
            </p>
            <p className="font-semibold text-[#111]">
              {formatDate(form.event_date)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E] mb-1">
              Time
            </p>
            <p className="font-semibold text-[#111]">
              {form.start_time || "-"}
            </p>
          </div>
        </div>

        {/* Delivery Method Badge */}
        <div className="flex items-center gap-2 mb-6">
          {isDelivery ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2">
              <Truck size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                Delivery
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-2">
              <Store size={16} className="text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                Pickup
              </span>
            </div>
          )}
        </div>

        {/* Cost Breakdown Table */}
        <div className="mb-8">
          <div className="flex items-center justify-between border-b-2 border-black/10 pb-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111]">
              Description
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#111]">
              Amount
            </span>
          </div>

          <div className="space-y-4">
            {!(isCustom && form.service_type === "Food Only") && (
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-[#111]">{displayName}</p>
                  <p className="text-xs text-[#6B6657] mt-0.5">
                    {getBasePriceDescription()}
                  </p>
                </div>
                <p className="font-semibold text-[#111]">
                  ₱{baseTotalAmount.toLocaleString()}
                </p>
              </div>
            )}

            {isCustom &&
              form.service_type === "Food Only" &&
              form.selected_menu &&
              form.selected_menu.length > 0 && (
                <div className="space-y-3 my-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9E9E]">
                    {displayName} (Selected Menu)
                  </p>
                  {form.selected_menu.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#111]">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#6B6657]">
                          ₱{(item.price || 0).toLocaleString()} / pax
                        </p>
                      </div>
                      <p className="text-sm font-medium text-[#111]">
                        ₱{((item.price || 0) * guestCount).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}

            {form.additional_services?.map((svc, idx) => {
              const price = Number(svc.price) || 0;
              const qty = Number(svc.quantity) || 1;
              return (
                <div key={idx} className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-[#111]">{svc.name}</p>
                    <p className="text-xs text-[#6B6657] mt-0.5">
                      ₱{price.toLocaleString()} x {qty}
                    </p>
                  </div>
                  <p className="font-semibold text-[#111]">
                    ₱{(price * qty).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-black/10 mt-6 pt-6">
            <span className="font-bold text-[#111]">Estimated Total</span>
            <span className="text-xl font-bold text-[#D4AF37]">
              ₱{totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Payment Section - Changes based on delivery method */}
        <div className="space-y-4">
          <h4 className="font-bold text-[#111] flex items-center gap-2">
            <CreditCard size={18} className="text-[#D4AF37]" />
            Payment Method
          </h4>

          {/* Delivery = Cash on Delivery with deposit */}
          {isDelivery && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-blue-50/30 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h5 className="font-semibold text-[#111] text-sm">
                      Cash on Delivery
                    </h5>
                    <p className="text-xs text-[#6B6657] mt-0.5">
                      Pay the remaining balance when your order is delivered
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6B6657]">
                      Deposit Required Today
                    </span>
                    <span
                      className="text-2xl font-bold text-[#D4AF37]"
                      style={{ fontFamily: "Playfair Display, serif" }}
                    >
                      ₱{depositAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-black/10">
                    <span className="text-xs text-[#6B6657]">
                      Remaining on Delivery
                    </span>
                    <span className="text-sm font-semibold text-[#111]">
                      ₱{remainingBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-black/10">
                    <Truck size={14} className="text-[#6B6657]" />
                    <span className="text-xs text-[#6B6657]">
                      Balance collected upon delivery to your address
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Deposit secures your delivery
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    A {depositPercentage}% deposit is required to confirm your
                    delivery order. The remaining balance will be collected when
                    your order arrives.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pickup = Pay at Store (No deposit) */}
          {isPickup && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-purple-50/30 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Store size={20} />
                  </div>
                  <div>
                    <h5 className="font-semibold text-[#111] text-sm">
                      Pay at Pickup
                    </h5>
                    <p className="text-xs text-[#6B6657] mt-0.5">
                      Pay the full amount when you pick up your order
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#6B6657]">Total Amount</span>
                    <span
                      className="text-2xl font-bold text-purple-600"
                      style={{ fontFamily: "Playfair Display, serif" }}
                    >
                      ₱{totalPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-black/10">
                    <Calendar size={14} className="text-[#6B6657]" />
                    <span className="text-xs text-[#6B6657]">
                      Pay on your scheduled pickup date
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-purple-50 p-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <Receipt size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-purple-900">
                    No deposit required for pickup
                  </p>
                  <p className="text-xs text-purple-700 mt-0.5">
                    For pickup orders, simply pay the full amount when you
                    arrive to collect your order. No upfront payment needed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
