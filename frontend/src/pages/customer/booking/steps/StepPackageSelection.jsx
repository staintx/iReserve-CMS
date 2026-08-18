import { useState, useRef } from "react";
import {
  Check,
  CheckCircle2,
  Package2,
  Users,
  Ruler,
  ChevronDown,
  X,
  Sparkles,
  Palette,
  Layers,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Loader2,
} from "lucide-react";
import {
  Card,
  SH,
  SectionTitle,
  InfoNote,
  StepShell,
} from "../components/BookingSharedUI";
import { focusRing, formatPeso } from "../lib/bookingUI";
import { isSpecialOffer } from "@/lib/specialOffers";
import { cn } from "@/lib/utils";
import EstimateSummary from "../components/EstimateSummary";
import { CustomerAPI } from "@/api/customer";
import useToast from "@/hooks/useToast";

const THEME_PRESETS = [
  "Rustic Boho",
  "Modern Minimalist",
  "Enchanted Forest",
  "Classic Gold & Royal",
  "Tropical / Luau",
  "Romantic Floral",
  "Elegant Black & White",
  "Industrial Chic",
  "Corporate / Gala",
  "Other / Custom Theme",
];

const PALETTE_PRESETS = [
  {
    name: "Emerald Green & Gold",
    colors: ["#0F5132", "#D4AF37", "#F8F9FA"],
  },
  {
    name: "Blush Pink & Rose Gold",
    colors: ["#FAD2E1", "#B76E79", "#FFFFFF"],
  },
  {
    name: "Navy Blue & Silver",
    colors: ["#001F3F", "#C0C0C0", "#FFFFFF"],
  },
  {
    name: "Terracotta & Cream",
    colors: ["#E07A5F", "#F4F1DE", "#3D405B"],
  },
  {
    name: "Dusty Rose & Sage",
    colors: ["#D8A47F", "#8A9A5B", "#F5F5DC"],
  },
  {
    name: "Classic Black & Gold",
    colors: ["#1E1E1E", "#D4AF37", "#FFFFFF"],
  },
  {
    name: "Custom Palette",
    colors: ["#64748B", "#94A3B8", "#CBD5E1"],
  },
];

const SETUP_SCOPE_OPTIONS = [
  { id: "stage_backdrop", label: "Stage / Backdrop Styling", desc: "Main stage, lighted arch, or floral backdrop" },
  { id: "vip_tables", label: "VIP / Presidential Table Styling", desc: "Special centerpieces, chargers, and luxury seating" },
  { id: "guest_tables", label: "Guest Tables & Chairs Styling", desc: "Linens, Tiffany / covered chairs, and centerpieces" },
  { id: "buffet_station", label: "Buffet Station & Dessert Bar", desc: "Themed skirtings, food warmers, and dessert tier risers" },
  { id: "ceiling_draping", label: "Ceiling Draping & Fairy Lights", desc: "Overhead fabrics, warm ambient fairy lights & festoons" },
  { id: "entrance_arch", label: "Entrance Arch / Photo Wall Area", desc: "Welcome signage, photo spot for guest arrivals" },
  { id: "sound_lights", label: "Sound System, Mood Lights & Trussing", desc: "Speakers, wireless mics, moving heads & stage lights" },
];

const BUDGET_PRESETS = [
  "Below ₱30,000",
  "₱30,000 – ₱50,000",
  "₱50,000 – ₱80,000",
  "₱80,000 – ₱120,000",
  "₱120,000+",
  "Flexible / Open to Proposal",
];

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
          "m-3.5 mt-auto rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors flex items-center justify-center gap-1.5",
          isSelected
            ? "bg-[#4C81E0] text-white hover:bg-red-600"
            : "border border-[#E2E8F0] bg-white text-[#1E293B] hover:border-[#4C81E0]",
          focusRing,
        )}
      >
        {isSelected ? (
          <>
            <X size={14} />
            Unselect Package
          </>
        ) : (
          "Choose this package"
        )}
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
  const { notify } = useToast();
  const fileInputRef = useRef(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const isCustomSetup = Boolean(form.is_custom_setup);

  // This step chooses a *setup* package and its scaffold size. A Special Offer
  // is a different proposition — a fixed per-person price with its own food
  // rules and guest cap — and is booked from its own card on the Packages page,
  // which is where those terms are actually explained. Listing one here would
  // drop a customer into a setup-shaped flow that cannot satisfy its rules.
  const matchingPackages = (packages || []).filter(
    (pkg) =>
      !isSpecialOffer(pkg) &&
      (!pkg?.package_type ||
        pkg?.package_type === "Event Setup Only" ||
        pkg?.package_type === "Food + Event Setup"),
  );

  const selectedPackage =
    !isCustomSetup && selectedPackageId && selectedPackageId !== "none"
      ? (packages || []).find((pkg) => pkg._id === selectedPackageId) || packageDetails
      : null;

  const scaffoldOptions = Array.isArray(selectedPackage?.scaffold_size_options)
    ? selectedPackage.scaffold_size_options
    : [];

  const updateForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  // Handle Tab Switch
  const handleTabSwitch = (tab) => {
    if (tab === "custom") {
      setForm((prev) => ({
        ...prev,
        is_custom_setup: true,
        package_id: "none",
        selected_scaffold_option_id: "",
        scaffold_width: undefined,
        scaffold_length: undefined,
        scaffold_base_area: undefined,
        scaffold_price: undefined,
        scaffold_guest_min: undefined,
        scaffold_guest_max: undefined,
        selected_package_addons: [],
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        is_custom_setup: false,
        package_id: prev.package_id === "none" ? "" : prev.package_id,
      }));
    }
  };

  // Handle Setup Scope Checkbox Toggle
  const toggleScopeItem = (itemLabel) => {
    const currentScope = Array.isArray(form.custom_setup_scope)
      ? form.custom_setup_scope
      : [];
    const exists = currentScope.includes(itemLabel);
    const updated = exists
      ? currentScope.filter((item) => item !== itemLabel)
      : [...currentScope, itemLabel];
    updateForm({ custom_setup_scope: updated });
  };

  // Handle Inspiration Image Uploads
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentImages = Array.isArray(form.inspiration_images)
      ? form.inspiration_images
      : [];

    if (currentImages.length + files.length > 5) {
      notify("You can upload a maximum of 5 inspiration photos.", "error");
      return;
    }

    setUploadingImages(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));

      const res = await CustomerAPI.uploadInspirationImages(formData);
      if (res?.data?.urls && Array.isArray(res.data.urls)) {
        updateForm({
          inspiration_images: [...currentImages, ...res.data.urls],
        });
        notify("Inspiration photos uploaded successfully!", "success");
      }
    } catch (err) {
      notify(
        err?.response?.data?.message || "Failed to upload inspiration photos.",
        "error",
      );
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeInspirationImage = (indexToRemove) => {
    const currentImages = Array.isArray(form.inspiration_images)
      ? form.inspiration_images
      : [];
    updateForm({
      inspiration_images: currentImages.filter((_, idx) => idx !== indexToRemove),
    });
  };

  return (
    <StepShell aside={<EstimateSummary estimate={estimate} />}>
      <SH
        title="Event Setup & Styling Concept"
        sub="Choose a ready-made package or design a 100% bespoke event setup from scratch."
      />

      {/* Choice Tabs: Pre-made Package vs Design from Scratch */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleTabSwitch("package")}
          className={cn(
            "flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all",
            !isCustomSetup
              ? "border-[#4C81E0] bg-[#4C81E0]/5 shadow-sm ring-1 ring-[#4C81E0]"
              : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/40",
            focusRing,
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              !isCustomSetup
                ? "bg-[#4C81E0] text-white"
                : "bg-slate-100 text-[#64748B]",
            )}
          >
            <Package2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#1E293B]">
                Start from a Pre-made Package
              </span>
              {!isCustomSetup && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4C81E0] text-white text-[10px]">
                  ✓
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Pick from our ready-to-go styled setup packages with scaffold size options.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch("custom")}
          className={cn(
            "flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all",
            isCustomSetup
              ? "border-[#4C81E0] bg-[#4C81E0]/5 shadow-sm ring-1 ring-[#4C81E0]"
              : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/40",
            focusRing,
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              isCustomSetup
                ? "bg-[#4C81E0] text-white"
                : "bg-slate-100 text-[#64748B]",
            )}
          >
            <Sparkles size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#1E293B]">
                Design from Scratch (100% Custom)
              </span>
              {isCustomSetup && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4C81E0] text-white text-[10px]">
                  ✓
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Specify your dream theme, color palette, custom setup items & moodboard pegs.
            </p>
          </div>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB A: PRE-MADE PACKAGE SELECTION */}
      {/* ------------------------------------------------------------- */}
      {!isCustomSetup && (
        <div className="flex flex-col gap-4">
          {selectedPackage && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#4C81E0]/30 bg-[#4C81E0]/5 p-3 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 size={18} className="shrink-0 text-[#4C81E0]" />
                <span className="truncate text-[#1E293B]">
                  <span className="font-semibold">Selected Package:</span>{" "}
                  <span className="font-bold">{selectedPackage.name}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectPackage(selectedPackage._id)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm transition-all hover:bg-red-50 active:scale-95 cursor-pointer"
              >
                <X size={14} />
                Unselect Package
              </button>
            </div>
          )}

          {errors.package_id && (
            <InfoNote tone="danger">
              {errors.package_id}
            </InfoNote>
          )}

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
                  showPerGuestPrice={false}
                  onSelect={() => onSelectPackage(pkg._id)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center text-sm text-[#64748B]">
              No setup packages are available right now. Switch to &ldquo;Design from Scratch&rdquo; to describe your setup vision.
            </Card>
          )}

          {selectedPackage && scaffoldOptions.length > 0 && (
            <Card className="p-4">
              <SectionTitle icon={Ruler}>Setup footprint size</SectionTitle>
              <p className="mb-3 text-[13px] text-[#64748B]">
                Pick the setup footprint your venue needs.
              </p>

              {setupCapacity && (
                <InfoNote
                  tone={
                    setupCapacity.status === "over"
                      ? "danger"
                      : setupCapacity.status === "under"
                        ? "warn"
                        : "success"
                  }
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
                            Setup Price
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
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB B: 100% BESPOKE CUSTOM EVENT SETUP */}
      {/* ------------------------------------------------------------- */}
      {isCustomSetup && (
        <div className="space-y-5">
          {/* Card 1: Theme & Motif */}
          <Card className="p-4 sm:p-5">
            <SectionTitle icon={Sparkles}>1. Theme &amp; Styling Motif</SectionTitle>
            <p className="mb-3 text-[13px] text-[#64748B]">
              Pick a styling theme or describe the specific aesthetic you want us to craft.
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {THEME_PRESETS.map((preset) => {
                const isSelected = form.event_theme === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => updateForm({ event_theme: preset })}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      isSelected
                        ? "border-[#4C81E0] bg-[#4C81E0]/10 text-[#1E293B] font-semibold ring-1 ring-[#4C81E0]"
                        : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#4C81E0]/50",
                      focusRing,
                    )}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>

            <div className="mt-2">
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Custom Theme Description or Nuances
              </label>
              <input
                type="text"
                value={form.event_theme || ""}
                onChange={(e) => updateForm({ event_theme: e.target.value })}
                placeholder="e.g. Modern Rustic Boho with Pampas Grass & Vintage Gold"
                className={cn(
                  "w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-sm text-[#1E293B] placeholder:text-[#94A3B8]",
                  focusRing,
                )}
              />
              {errors.event_theme && (
                <p className="text-xs text-red-600 mt-1">{errors.event_theme}</p>
              )}
            </div>
          </Card>

          {/* Card 2: Color Palette */}
          <Card className="p-4 sm:p-5">
            <SectionTitle icon={Palette}>2. Color Palette &amp; Accents</SectionTitle>
            <p className="mb-3 text-[13px] text-[#64748B]">
              Choose the primary and accent colors for your linens, florals, and backdrop draping.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-3">
              {PALETTE_PRESETS.map((preset) => {
                const isSelected =
                  Array.isArray(form.event_palette) &&
                  form.event_palette.join(", ") === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() =>
                      updateForm({
                        event_palette: [preset.name],
                      })
                    }
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition-all",
                      isSelected
                        ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0]"
                        : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50",
                      focusRing,
                    )}
                  >
                    <span className="text-xs font-medium text-[#1E293B]">
                      {preset.name}
                    </span>
                    <span className="flex items-center -space-x-1 shrink-0">
                      {preset.colors.map((c, i) => (
                        <span
                          key={i}
                          className="h-4 w-4 rounded-full border border-white shadow-xs"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Custom Palette Color Names / Codes (Optional)
              </label>
              <input
                type="text"
                value={
                  Array.isArray(form.event_palette)
                    ? form.event_palette.join(", ")
                    : form.event_palette || ""
                }
                onChange={(e) =>
                  updateForm({
                    event_palette: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="e.g. Sage Green, Cream, Dusty Gold, Champagne"
                className={cn(
                  "w-full rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-sm text-[#1E293B] placeholder:text-[#94A3B8]",
                  focusRing,
                )}
              />
            </div>
          </Card>

          {/* Card 3: Setup Scope & Requirements */}
          <Card className="p-4 sm:p-5">
            <SectionTitle icon={Layers}>3. What Would You Like Us to Style &amp; Setup?</SectionTitle>
            <p className="mb-3 text-[13px] text-[#64748B]">
              Select all elements you want our styling and production team to handle for your venue.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SETUP_SCOPE_OPTIONS.map((item) => {
                const isChecked = (form.custom_setup_scope || []).includes(item.label);
                return (
                  <label
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 transition-all cursor-pointer",
                      isChecked
                        ? "border-[#4C81E0] bg-[#4C81E0]/5"
                        : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleScopeItem(item.label)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#4C81E0] focus:ring-[#4C81E0]"
                    />
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-[#1E293B]">
                        {item.label}
                      </span>
                      <span className="block text-[11px] text-[#64748B] leading-snug">
                        {item.desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </Card>

          {/* Card 4: Moodboard & Inspiration Uploads */}
          <Card className="p-4 sm:p-5">
            <SectionTitle icon={ImageIcon}>4. Inspiration Photos &amp; Moodboard (Optional)</SectionTitle>
            <p className="mb-3 text-[13px] text-[#64748B]">
              Upload up to 5 reference photos (e.g. Pinterest pegs, Instagram styling) so our team can visualize your dream setup.
            </p>

            {/* Upload Button & Previews */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="moodboard-upload"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages || (form.inspiration_images || []).length >= 5}
                className={cn(
                  "flex h-20 w-24 flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-center text-xs font-medium text-[#64748B] transition-colors hover:border-[#4C81E0] hover:text-[#4C81E0] disabled:opacity-50",
                  focusRing,
                )}
              >
                {uploadingImages ? (
                  <Loader2 size={18} className="animate-spin text-[#4C81E0]" />
                ) : (
                  <>
                    <Upload size={18} className="mb-1 text-[#94A3B8]" />
                    <span>Upload</span>
                  </>
                )}
              </button>

              {(form.inspiration_images || []).map((url, idx) => (
                <div
                  key={idx}
                  className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E2E8F0] bg-slate-100 shadow-xs"
                >
                  <img
                    src={url}
                    alt={`Inspiration ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeInspirationImage(idx)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-90 hover:bg-red-600 transition-colors"
                    title="Remove image"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[#94A3B8]">
              Formats accepted: JPG, PNG, WEBP. Max 5 photos.
            </p>
          </Card>

          {/* Card 5: Target Budget & Notes */}
          <Card className="p-4 sm:p-5">
            <SectionTitle icon={DollarSign}>5. Target Budget &amp; Special Vision Notes</SectionTitle>
            <p className="mb-3 text-[13px] text-[#64748B]">
              Helping us understand your budget allows us to tailor fabrications and rentals to your financial comfort.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                Target Budget Range (Optional)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BUDGET_PRESETS.map((budget) => {
                  const isSelected = form.budget_range === budget;
                  return (
                    <button
                      key={budget}
                      type="button"
                      onClick={() => updateForm({ budget_range: budget })}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-center",
                        isSelected
                          ? "border-[#4C81E0] bg-[#4C81E0]/10 text-[#1E293B] font-semibold ring-1 ring-[#4C81E0]"
                          : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#4C81E0]/50",
                        focusRing,
                      )}
                    >
                      {budget}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E293B] mb-1">
                Custom Setup Vision &amp; Venue Details (Optional)
              </label>
              <textarea
                rows={3}
                value={form.custom_setup_notes || ""}
                onChange={(e) => updateForm({ custom_setup_notes: e.target.value })}
                placeholder="e.g. Venue has high ceilings with wooden trusses; we want fairy lights spanning across the hall with an elevated stage for the couple."
                className={cn(
                  "w-full rounded-xl border border-[#CBD5E1] bg-white p-3 text-sm text-[#1E293B] placeholder:text-[#94A3B8]",
                  focusRing,
                )}
              />
            </div>
          </Card>
        </div>
      )}
    </StepShell>
  );
}
