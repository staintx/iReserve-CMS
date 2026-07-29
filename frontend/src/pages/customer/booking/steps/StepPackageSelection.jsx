import { Card, SH } from "../components/BookingSharedUI";
import { CheckCircle2, Package2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StepPackageSelection({
  packages = [],
  selectedPackageId,
  onSelectPackage,
  form = {},
  setForm = () => {},
  packageDetails = null,
}) {
  const eventSetupPackages = (packages || []).filter(
    (pkg) => pkg?.package_type === "Event Setup Only",
  );

  const selectedPackage =
    (packages || []).find((p) => p._id === selectedPackageId) || packageDetails;

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const selectedOptionId = form.selected_scaffold_option_id;

  const scaffoldOptions = Array.isArray(selectedPackage?.scaffold_size_options)
    ? selectedPackage.scaffold_size_options
    : [];

  const currentOption = scaffoldOptions.find(
    (o) => String(o._id) === String(selectedOptionId),
  );
  const currentPrice = currentOption
    ? Number(currentOption.price || 0)
    : Number(selectedPackage?.setup_price || 0);

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

                    {/* Removed setup price display, only showing guest max */}
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#6B6657]">
                      {pkg.guest_max ? (
                        <span className="rounded-full bg-black/[0.04] px-3 py-1">
                          Up to {pkg.guest_max} guests
                        </span>
                      ) : null}
                      {pkg.guest_min ? (
                        <span className="rounded-full bg-black/[0.04] px-3 py-1">
                          Min {pkg.guest_min} guests
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

      {selectedPackage && scaffoldOptions.length > 0 && (
        <div className="mt-8 rounded-lg border p-4 bg-white">
          <h4 className="mb-3 font-semibold">Choose scaffold size</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {scaffoldOptions.map((opt) => {
              const isActive = String(opt._id) === String(selectedOptionId);
              const dimensions = `${opt.width_ft}ft × ${opt.length_ft}ft`;
              return (
                <button
                  key={opt._id}
                  type="button"
                  onClick={() =>
                    updateForm({
                      selected_scaffold_option_id: String(opt._id),
                      scaffold_width: opt.width_ft || undefined,
                      scaffold_length: opt.length_ft || undefined,
                      scaffold_base_area:
                        opt.area_ft2 ||
                        (opt.width_ft && opt.length_ft
                          ? opt.width_ft * opt.length_ft
                          : undefined),
                    })
                  }
                  className={cn(
                    "w-full rounded-lg border p-4 text-left flex items-center justify-between transition-all",
                    isActive
                      ? "border-[#D4AF37] bg-[#FDF9F3] shadow-sm"
                      : "border-black/[0.06] bg-white hover:border-[#D4AF37]/40 hover:bg-[#F7F4EE]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold",
                        isActive
                          ? "bg-[#D4AF37] text-white"
                          : "bg-gray-100 text-[#6B6657]",
                      )}
                    >
                      {opt.width_ft}×{opt.length_ft}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {opt.label || dimensions}
                      </div>
                      <div className="text-xs text-[#6B6657] mt-0.5">
                        {dimensions}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#6B6657]">Price</div>
                    <div className="font-semibold text-sm">
                      ₱{Number(opt.price || 0).toLocaleString()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {currentOption && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-[#FDF9F3] px-4 py-3">
              <div>
                <div className="text-xs text-[#6B6657]">Selected Size</div>
                <div className="font-medium text-sm">
                  {currentOption.label ||
                    `${currentOption.width_ft}ft × ${currentOption.length_ft}ft`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#6B6657]">Setup Price</div>
                <div className="text-lg font-semibold text-[#111]">
                  ₱{Number(currentPrice || 0).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
