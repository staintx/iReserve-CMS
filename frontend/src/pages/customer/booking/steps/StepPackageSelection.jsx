import { Card, SH } from "../components/BookingSharedUI";
import { CheckCircle2, Package2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StepPackageSelection({
  packages = [],
  selectedPackageId,
  onSelectPackage,
}) {
  const eventSetupPackages = (packages || []).filter(
    (pkg) => pkg?.package_type === "Event Setup Only",
  );

  return (
    <div className="mx-auto max-w-6xl py-6">
      <SH
        title="Choose an Event Setup Package"
        sub="Select one of our curated packages for event setup. This will include setup equipment managed by our team."
      />

      {eventSetupPackages.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {eventSetupPackages.map((pkg) => {
            const isSelected = selectedPackageId === pkg._id;
            return (
              <div
                key={pkg._id}
                className={cn(
                  "rounded-2xl border-2 p-4 transition-all flex flex-col",
                  isSelected
                    ? "border-[#D4AF37] bg-[#FDF9F3] shadow-sm"
                    : "border-black/[0.06] bg-white hover:border-[#D4AF37]/40",
                )}
              >
                <div className="flex gap-4">
                  <div className="w-28 h-20 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                    {pkg.image_url ? (
                      <img
                        src={pkg.image_url}
                        alt={pkg.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#9E9E9E]">
                        <Package2 size={28} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-[#111]">
                          {pkg.name}
                        </h3>
                        <p className="mt-1 text-sm text-[#6B6657] line-clamp-2">
                          {pkg.description}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-[#D4AF37]" />
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-[#6B6657]">
                      <span className="rounded-full bg-black/[0.04] px-3 py-1">
                        ₱{Number(pkg.setup_price || 0).toLocaleString()}
                      </span>
                      {pkg.guest_max ? (
                        <span className="rounded-full bg-black/[0.04] px-3 py-1">
                          Up to {pkg.guest_max} guests
                        </span>
                      ) : null}
                    </div>

                    {pkg.inclusions && pkg.inclusions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pkg.inclusions.slice(0, 6).map((inc, idx) => (
                          <span
                            key={idx}
                            className="text-xs rounded-full bg-black/[0.04] px-3 py-1"
                          >
                            {inc}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectPackage(pkg._id)}
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm font-medium",
                      isSelected
                        ? "bg-[#D4AF37] text-white"
                        : "bg-white border border-black/[0.06] hover:bg-[#F7F4EE]",
                    )}
                  >
                    {isSelected ? "Selected" : "Select Package"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="p-6 text-sm text-[#6B6657]">
          No event setup packages are available right now. Please check back
          later.
        </Card>
      )}
    </div>
  );
}
