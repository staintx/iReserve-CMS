import { Card, SH, SectionTitle, StepShell, focusRing, formatPeso } from "../components/BookingSharedUI";
import { CheckCircle2, Package2, Users, Ruler } from "lucide-react";
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

  return (
    <StepShell>
      <SH
        title="Choose an Event Setup Package"
        sub="Each package includes setup equipment managed by our team."
      />

      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          scaffoldOptions.length > 0 && "lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]",
        )}
      >
        {/* Packages */}
        <div>
          {eventSetupPackages.length > 0 ? (
            <div className="grid max-h-[56vh] grid-cols-1 gap-3 overflow-y-auto pr-0.5 xl:grid-cols-2">
              {eventSetupPackages.map((pkg) => {
                const isSelected = selectedPackageId === pkg._id;
                return (
                  <button
                    key={pkg._id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectPackage(pkg._id)}
                    className={cn(
                      "flex flex-col rounded-2xl border-2 p-3.5 text-left transition-all",
                      isSelected
                        ? "border-[#4C81E0] bg-[#4C81E0]/5 shadow-sm"
                        : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50 hover:shadow-sm",
                      focusRing,
                    )}
                  >
                    <span className="flex gap-3">
                      <span className="block h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F8FAFC]">
                        {pkg.image_url ? (
                          <img
                            src={pkg.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[#CBD5E1]">
                            <Package2 size={24} />
                          </span>
                        )}
                      </span>

                      <span className="block min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[#1E293B]">
                            {pkg.name}
                          </span>
                          {isSelected && (
                            <CheckCircle2
                              size={17}
                              className="shrink-0 text-[#4C81E0]"
                            />
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-[#64748B]">
                          {pkg.description}
                        </span>

                        {pkg.inclusions?.length > 0 && (
                          <span className="mt-2 flex flex-wrap gap-1.5">
                            {pkg.inclusions.slice(0, 4).map((inc, idx) => (
                              <span
                                key={idx}
                                className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] text-[#64748B]"
                              >
                                {inc}
                              </span>
                            ))}
                            {pkg.inclusions.length > 4 && (
                              <span className="px-1 text-[11px] text-[#94A3B8]">
                                +{pkg.inclusions.length - 4} more
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </span>

                    <span
                      className={cn(
                        "mt-3 self-end rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                        isSelected
                          ? "bg-[#4C81E0] text-white"
                          : "border border-[#E2E8F0] bg-white text-[#64748B]",
                      )}
                    >
                      {isSelected ? "Selected" : "Select package"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <Card className="p-6 text-center text-sm text-[#64748B]">
              No event setup packages are available right now. Please check back
              later.
            </Card>
          )}
        </div>

        {/* Scaffold size */}
        {selectedPackage && scaffoldOptions.length > 0 && (
          <Card className="p-4 sm:p-5">
            <SectionTitle icon={Ruler}>Scaffold size</SectionTitle>

            <div className="grid max-h-[52vh] grid-cols-1 gap-2.5 overflow-y-auto pr-0.5">
              {scaffoldOptions.map((opt) => {
                const isActive = String(opt._id) === String(selectedOptionId);
                const dimensions = `${opt.width_ft}ft × ${opt.length_ft}ft`;
                const hasGuestRange = opt.guest_min || opt.guest_max;

                return (
                  <button
                    key={opt._id}
                    type="button"
                    aria-pressed={isActive}
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
                        scaffold_price: opt.price || undefined,
                        scaffold_guest_min: opt.guest_min || undefined,
                        scaffold_guest_max: opt.guest_max || undefined,
                      })
                    }
                    className={cn(
                      "w-full rounded-xl border-2 p-3 text-left transition-all",
                      isActive
                        ? "border-[#4C81E0] bg-[#4C81E0]/5 shadow-sm"
                        : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50 hover:bg-[#F8FAFC]",
                      focusRing,
                    )}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold transition-colors",
                            isActive
                              ? "bg-[#4C81E0] text-white"
                              : "bg-[#F1F5F9] text-[#64748B]",
                          )}
                        >
                          {opt.width_ft}×{opt.length_ft}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[#1E293B]">
                            {opt.label || dimensions}
                          </span>
                          <span className="block text-xs text-[#64748B]">
                            {dimensions}
                          </span>
                        </span>
                      </span>

                      <span className="shrink-0 text-right">
                        <span className="block text-[11px] uppercase tracking-wider text-[#94A3B8]">
                          Price
                        </span>
                        <span className="block text-sm font-bold tabular-nums text-[#1E293B]">
                          {formatPeso(opt.price)}
                        </span>
                      </span>
                    </span>

                    {hasGuestRange && (
                      <span className="mt-2 flex items-center gap-2 border-t border-[#E2E8F0] pt-2">
                        <Users
                          size={13}
                          className={cn(
                            "shrink-0",
                            isActive ? "text-[#4C81E0]" : "text-[#94A3B8]",
                          )}
                        />
                        <span className="text-xs text-[#64748B]">
                          {opt.guest_min && opt.guest_max
                            ? `${opt.guest_min} – ${opt.guest_max} guests`
                            : opt.guest_min
                              ? `Min ${opt.guest_min} guests`
                              : `Up to ${opt.guest_max} guests`}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </StepShell>
  );
}
