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
  FieldStatusPill,
  StepShell,
} from "../components/BookingSharedUI";
import { focusRing, formatPeso } from "../lib/bookingUI";
import { isSpecialOffer } from "@/lib/specialOffers";
import { cn } from "@/lib/utils";
import EstimateSummary from "../components/EstimateSummary";
import ThemePicker, { ColorPalettePicker } from "../components/ThemePicker";
import { CustomerAPI } from "@/api/customer";
import useToast from "@/hooks/useToast";

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
  const PREVIEW = 2;
  const preview = expanded ? all : all.slice(0, PREVIEW);
  const hiddenCount = all.length - preview.length;

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border transition-all select-none",
        isSelected
          ? "border-[#4C81E0] bg-[#4C81E0]/[0.03] ring-1 ring-[#4C81E0] shadow-xs"
          : "border-slate-200 bg-white hover:border-[#4C81E0]/40 shadow-2xs",
      )}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className={cn("flex gap-3 rounded-t-lg p-3 text-left cursor-pointer", focusRing)}
      >
        <span className="block h-12 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100 border border-slate-200/60">
          {pkg.image_url ? (
            <img src={pkg.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-slate-300">
              <Package2 size={18} />
            </span>
          )}
        </span>

        <span className="block min-w-0 flex-1">
          <span className="flex items-start justify-between gap-1.5">
            <span className="truncate text-sm font-bold text-slate-900">
              {pkg.name}
            </span>
            {isSelected && (
              <CheckCircle2 size={15} className="shrink-0 text-[#4C81E0]" />
            )}
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-[#4C81E0]">
            {showPerGuestPrice && pkg.price_per_guest > 0
              ? `${formatPeso(pkg.price_per_guest)} per guest`
              : pkg.setup_price > 0
                ? `${formatPeso(pkg.setup_price)} for setup`
                : "Priced on quotation"}
          </span>
          {pkg.description && (
            <span className="mt-0.5 line-clamp-1 block text-[11px] text-slate-500">
              {pkg.description}
            </span>
          )}
        </span>
      </button>

      {/* Inclusions summary — collapsed to PREVIEW items */}
      {preview.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2 text-xs rounded-b-lg">
          <ul className="space-y-0.5 text-slate-600 text-[11px]">
            {preview.map((line, idx) => (
              <li key={`${line}-${idx}`} className="flex gap-1.5 items-start">
                <Check size={12} className="mt-0.5 shrink-0 text-[#4C81E0]" />
                <span className="truncate">{line}</span>
              </li>
            ))}
          </ul>
          {(hiddenCount > 0 || expanded) && (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              className={cn(
                "mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#4C81E0] hover:underline cursor-pointer",
                focusRing,
              )}
            >
              {expanded ? "Show less" : `+${hiddenCount} more inclusions`}
              <ChevronDown
                size={12}
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
          "m-2.5 mt-auto rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer",
          isSelected
            ? "bg-[#4C81E0] text-white hover:bg-red-600"
            : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
          focusRing,
        )}
      >
        {isSelected ? (
          <>
            <X size={13} />
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
      <div className="mb-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => handleTabSwitch("package")}
          className={cn(
            "flex items-center gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer",
            !isCustomSetup
              ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0] shadow-xs"
              : "border-slate-200 bg-white hover:border-slate-300",
            focusRing,
          )}
        >
          <div
            className={cn(
              "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-md transition-colors",
              !isCustomSetup
                ? "bg-[#4C81E0] text-white"
                : "bg-slate-100 text-slate-500",
            )}
          >
            <Package2 size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                Pre-made Package
              </span>
              {!isCustomSetup && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#4C81E0] text-white text-[9px] font-bold">
                  ✓
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
              Ready styled setup packages with scaffold size choices.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabSwitch("custom")}
          className={cn(
            "flex items-center gap-3 rounded-lg border p-3 text-left transition-all cursor-pointer",
            isCustomSetup
              ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0] shadow-xs"
              : "border-slate-200 bg-white hover:border-slate-300",
            focusRing,
          )}
        >
          <div
            className={cn(
              "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-md transition-colors",
              isCustomSetup
                ? "bg-[#4C81E0] text-white"
                : "bg-slate-100 text-slate-500",
            )}
          >
            <Sparkles size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                Design from Scratch (100% Custom)
              </span>
              {isCustomSetup && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#4C81E0] text-white text-[9px] font-bold">
                  ✓
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
              Specify your dream theme, colors, elements & moodboard pegs.
            </p>
          </div>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB A: PRE-MADE PACKAGE SELECTION */}
      {/* ------------------------------------------------------------- */}
      {!isCustomSetup && (
        <div className="flex flex-col gap-3.5">
          {selectedPackage && (
            <div className="flex items-center justify-between gap-2.5 rounded-lg border border-[#4C81E0]/30 bg-[#4C81E0]/5 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 size={15} className="shrink-0 text-[#4C81E0]" />
                <span className="truncate text-slate-800">
                  <span className="font-semibold text-slate-500">Selected:</span>{" "}
                  <strong className="text-slate-900">{selectedPackage.name}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectPackage(selectedPackage._id)}
                className="flex shrink-0 items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 shadow-2xs hover:bg-red-50 cursor-pointer"
              >
                <X size={12} />
                Unselect
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
                "grid grid-cols-1 gap-2.5",
                matchingPackages.length > 1 && "sm:grid-cols-2",
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
            <Card className="p-5 text-center text-xs text-slate-500">
              No setup packages are available right now. Switch to &ldquo;Design from Scratch&rdquo; to describe your setup vision.
            </Card>
          )}

          {selectedPackage && scaffoldOptions.length > 0 && (
            <Card className="p-3.5 sm:p-4">
              <SectionTitle icon={Ruler}>Event space / scaffold size</SectionTitle>
              <p className="mb-2 text-xs text-slate-500">
                Select the scaffold dimensions for your venue footprint.
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
                  className="mb-2.5"
                >
                  {setupCapacity.message}
                </InfoNote>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                        "w-full rounded-lg border p-2.5 text-left transition-all cursor-pointer",
                        isActive
                          ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0] shadow-xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                        focusRing,
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold transition-colors",
                              isActive
                                ? "bg-[#4C81E0] text-white"
                                : "bg-slate-100 text-slate-600",
                            )}
                          >
                            {option.width_ft}×{option.length_ft}
                          </span>
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-bold text-slate-800 leading-tight">
                              {option.label || dimensions}
                            </span>
                            <span className="block text-[11px] text-slate-400 leading-tight">
                              {dimensions}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="block text-[10px] uppercase font-semibold text-slate-400">
                            Setup Price
                          </span>
                          <span className="block text-xs font-bold tabular-nums text-slate-900">
                            {formatPeso(option.price)}
                          </span>
                        </div>
                      </div>

                      {hasGuestRange && (
                        <div className="mt-1.5 flex items-center gap-1.5 border-t border-slate-100 pt-1.5 text-[11px] text-slate-500">
                          <Users
                            size={11}
                            className={cn(
                              "shrink-0",
                              isActive ? "text-[#4C81E0]" : "text-slate-400",
                            )}
                          />
                          <span>
                            {option.guest_min && option.guest_max
                              ? `${option.guest_min}–${option.guest_max} guests`
                              : option.guest_min
                                ? `From ${option.guest_min} guests`
                                : `Up to ${option.guest_max} guests`}
                          </span>
                        </div>
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
        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2 items-start">
          {/* Card 1: Styling & Theme Direction */}
          <Card className="p-3.5 sm:p-4">
            <SectionTitle icon={Sparkles}>1. Theme &amp; Color Palette</SectionTitle>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Theme / Motif (Optional)
                  </label>
                  <FieldStatusPill value={form.event_theme} />
                </div>
                <ThemePicker
                  value={form.event_theme}
                  onChange={(theme) => updateForm({ event_theme: theme })}
                />
                {errors.event_theme && (
                  <p className="text-[11px] text-red-600 mt-1">{errors.event_theme}</p>
                )}
              </div>

              <div className="border-t border-slate-100 pt-2.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Color Palette (Optional)
                  </label>
                  <FieldStatusPill
                    value={
                      Array.isArray(form.event_palette) && form.event_palette.length > 0
                        ? form.event_palette.join(", ")
                        : ""
                    }
                  />
                </div>
                <ColorPalettePicker
                  value={form.event_palette}
                  onChange={(palette) => updateForm({ event_palette: palette })}
                />
              </div>

              <div className="border-t border-slate-100 pt-2.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Setup Scope Elements
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {SETUP_SCOPE_OPTIONS.map((item) => {
                    const isChecked = (form.custom_setup_scope || []).includes(item.label);
                    return (
                      <label
                        key={item.id}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border p-2 text-left transition-all cursor-pointer",
                          isChecked
                            ? "border-[#4C81E0] bg-[#4C81E0]/5"
                            : "border-slate-200 bg-white hover:border-slate-300",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleScopeItem(item.label)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#4C81E0] focus:ring-[#4C81E0]"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="block text-xs font-bold text-slate-800 leading-tight">
                            {item.label}
                          </span>
                          <span className="block text-[11px] text-slate-500 leading-tight">
                            {item.desc}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Moodboard, Budget & Vision */}
          <Card className="p-3.5 sm:p-4">
            <SectionTitle icon={ImageIcon}>2. Moodboard &amp; Notes</SectionTitle>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Inspiration Photos (Optional)
                </label>
                <div className="flex flex-wrap items-center gap-2">
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
                      "flex h-16 w-16 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-[10px] font-semibold text-slate-500 hover:border-[#4C81E0] hover:text-[#4C81E0] disabled:opacity-50 cursor-pointer",
                      focusRing,
                    )}
                  >
                    {uploadingImages ? (
                      <Loader2 size={15} className="animate-spin text-[#4C81E0]" />
                    ) : (
                      <>
                        <Upload size={14} className="mb-0.5 text-slate-400" />
                        <span>Upload</span>
                      </>
                    )}
                  </button>

                  {(form.inspiration_images || []).map((url, idx) => (
                    <div
                      key={idx}
                      className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={url}
                        alt={`Inspiration ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeInspirationImage(idx)}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600 cursor-pointer"
                        title="Remove"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-slate-400">
                  Up to 5 images (JPG, PNG, WEBP).
                </p>
              </div>

              <div className="border-t border-slate-100 pt-2.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Target Budget Range (Optional)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {BUDGET_PRESETS.map((budget) => {
                    const isSelected = form.budget_range === budget;
                    return (
                      <button
                        key={budget}
                        type="button"
                        onClick={() => updateForm({ budget_range: budget })}
                        className={cn(
                          "rounded-md border px-2 py-1 text-xs font-medium transition-colors text-center cursor-pointer",
                          isSelected
                            ? "border-[#4C81E0] bg-[#4C81E0]/10 text-[#4C81E0] font-bold"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                          focusRing,
                        )}
                      >
                        {budget}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Custom Setup Vision &amp; Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={form.custom_setup_notes || ""}
                  onChange={(e) => updateForm({ custom_setup_notes: e.target.value })}
                  placeholder="e.g. High ceilings with wooden trusses; warm fairy lights and elevated couple stage."
                  className={cn(
                    "w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0]",
                    focusRing,
                  )}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </StepShell>
  );
}
