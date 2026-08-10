import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Package2,
  Users,
  Ruler,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  SH,
  SectionTitle,
  InfoNote,
  StepShell,
} from "../components/BookingSharedUI";
import { focusRing, formatPeso } from "../lib/bookingUI";
import { cn } from "@/lib/utils";
import EstimateSummary from "../components/EstimateSummary";
import {
  PACKAGE_TYPE_BY_SERVICE_TYPE,
  SERVICE_TYPES,
} from "../lib/bookingRules";

/**
 * Everything a package brings with it, in one list: the admin's own
 * `inclusions` copy first, then the equipment rows from `setup_equipment` so a
 * customer can see the actual tables and chairs rather than guessing.
 */
function packageInclusions(pkg) {
  const written = (pkg?.inclusions || []).filter(Boolean);
  const equipment = (pkg?.setup_equipment || [])
    .map((item) => {
      const name = item?.name || item?.item_name;
      if (!name) return null;
      const qty = Number(item?.quantity) || 0;
      return qty > 1 ? `${name} × ${qty}` : name;
    })
    .filter(Boolean);
  return { written, equipment };
}

function PackageCard({ pkg, isSelected, showPerGuestPrice, onSelect }) {
  const [expanded, setExpanded] = useState(false);
  const { written, equipment } = packageInclusions(pkg);
  const all = [...written, ...equipment];
  // A few inclusions stay visible on every card so packages can be compared
  // side by side. Hiding all of them behind an accordion meant opening each one
  // in turn just to see how they differ.
  const PREVIEW = 3;
  const preview = expanded ? all : all.slice(0, PREVIEW);
  const hiddenCount = all.length - preview.length;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border transition-colors",
        isSelected
          ? "border-[#4C81E0] bg-[#4C81E0]/5"
          : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50",
      )}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className={cn("flex gap-3 rounded-t-xl p-3.5 text-left", focusRing)}
      >
        <span className="block h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F8FAFC]">
          {pkg.image_url ? (
            <img src={pkg.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[#CBD5E1]">
              <Package2 size={20} />
            </span>
          )}
        </span>

        <span className="block min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="truncate text-base font-semibold text-[#1E293B]">
              {pkg.name}
            </span>
            {isSelected && (
              <CheckCircle2 size={16} className="shrink-0 text-[#4C81E0]" />
            )}
          </span>
          <span className="mt-0.5 block text-[13px] text-[#64748B]">
            {showPerGuestPrice && pkg.price_per_guest > 0
              ? `${formatPeso(pkg.price_per_guest)} per guest`
              : pkg.setup_price > 0
                ? `${formatPeso(pkg.setup_price)} for the setup`
                : "Priced on your quotation"}
          </span>
          {pkg.description && (
            <span className="mt-1 line-clamp-2 block text-xs leading-snug text-[#64748B]">
              {pkg.description}
            </span>
          )}
        </span>
      </button>

      {all.length > 0 && (
        <div className="border-t border-[#E2E8F0] px-3.5 py-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
            Includes
          </p>
          <ul className="space-y-1 text-[13px] text-[#64748B]">
            {preview.map((line) => (
              <li key={line} className="flex gap-2">
                <Check size={13} className="mt-0.5 shrink-0 text-[#4C81E0]" />
                {line}
              </li>
            ))}
          </ul>
          {(hiddenCount > 0 || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded text-[13px] font-medium text-[#4C81E0]",
                focusRing,
              )}
            >
              {expanded ? "Show less" : `Show ${hiddenCount} more`}
              <ChevronDown
                size={14}
                className={cn("transition-transform", expanded && "rotate-180")}
              />
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "m-3.5 mt-auto rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
          isSelected
            ? "bg-[#4C81E0] text-white"
            : "border border-[#E2E8F0] bg-white text-[#1E293B] hover:border-[#4C81E0]",
          focusRing,
        )}
      >
        {isSelected ? "Selected" : "Choose this package"}
      </button>
    </div>
  );
}

export default function StepPackageSelection({
  packages = [],
  selectedPackageId,
  onSelectPackage,
  form = {},
  setForm = () => {},
  packageDetails = null,
  estimate,
  errors = {},
  setupCapacity = null,
}) {
  const targetPackageType =
    PACKAGE_TYPE_BY_SERVICE_TYPE[form.service_type] ||
    PACKAGE_TYPE_BY_SERVICE_TYPE[SERVICE_TYPES.SETUP_ONLY];
  const isOptional = form.service_type === SERVICE_TYPES.FULL_SERVICE;

  const matchingPackages = (packages || []).filter(
    (pkg) => pkg?.package_type === targetPackageType,
  );

  const selectedPackage =
    (packages || []).find((pkg) => pkg._id === selectedPackageId) ||
    packageDetails;

  const scaffoldOptions = Array.isArray(selectedPackage?.scaffold_size_options)
    ? selectedPackage.scaffold_size_options
    : [];

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <StepShell aside={<EstimateSummary estimate={estimate} />}>
      <SH
        title={isOptional ? "Start From a Package" : "Choose Your Setup Package"}
        sub={
          isOptional
            ? "Optional. A package fixes your per-guest price and the setup we bring. Skip it and we will price your event from scratch."
            : "Each package sets the price and the equipment we bring. Open one to see what is included."
        }
      />

      {errors.package_id && (
        <InfoNote tone="danger" className="mb-4">
          {errors.package_id}
        </InfoNote>
      )}

      <div className="flex flex-col gap-3">
        {matchingPackages.length > 0 ? (
          <div
            className={cn(
              "grid grid-cols-1 gap-3",
              matchingPackages.length > 1 && "xl:grid-cols-2",
            )}
          >
            {matchingPackages.map((pkg) => (
              <PackageCard
                key={pkg._id}
                pkg={pkg}
                isSelected={selectedPackageId === pkg._id}
                showPerGuestPrice={isOptional}
                onSelect={() => onSelectPackage(pkg._id)}
              />
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center text-sm text-[#64748B]">
            {isOptional
              ? "No ready-made packages are available right now. Continue and we will build your event from scratch."
              : "No setup packages are available right now. Contact us and we will arrange something."}
          </Card>
        )}

        {selectedPackage && scaffoldOptions.length > 0 && (
          <Card className="p-4">
            <SectionTitle icon={Ruler}>Setup size</SectionTitle>
            <p className="mb-3 text-[13px] text-[#64748B]">
              Pick the footprint your venue needs. This sets the setup price.
            </p>

            {/* Capacity is a property of the structure; the guest count stays
                the customer's own number. This says how the two line up rather
                than forcing one to match the other. */}
            {setupCapacity && (
              <InfoNote
                tone={setupCapacity.status === "over" ? "danger" : setupCapacity.status === "under" ? "warn" : "success"}
                className="mb-3"
              >
                {setupCapacity.message}
              </InfoNote>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {scaffoldOptions.map((option) => {
                const isActive =
                  String(option._id) === String(form.selected_scaffold_option_id);
                const dimensions = `${option.width_ft}ft × ${option.length_ft}ft`;
                const hasGuestRange = option.guest_min || option.guest_max;

                return (
                  <button
                    key={option._id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() =>
                      updateForm({
                        selected_scaffold_option_id: String(option._id),
                        scaffold_width: option.width_ft || undefined,
                        scaffold_length: option.length_ft || undefined,
                        scaffold_base_area:
                          option.area_ft2 ||
                          (option.width_ft && option.length_ft
                            ? option.width_ft * option.length_ft
                            : undefined),
                        scaffold_price: option.price || undefined,
                        scaffold_guest_min: option.guest_min || undefined,
                        scaffold_guest_max: option.guest_max || undefined,
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
                          {option.width_ft}×{option.length_ft}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[#1E293B]">
                            {option.label || dimensions}
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
                          {formatPeso(option.price)}
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
                          {option.guest_min && option.guest_max
                            ? `${option.guest_min}–${option.guest_max} guests`
                            : option.guest_min
                              ? `From ${option.guest_min} guests`
                              : `Up to ${option.guest_max} guests`}
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
