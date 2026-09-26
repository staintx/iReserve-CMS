import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Pencil,
  Check,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Tag,
  FolderPlus,
  Lock,
  Package,
  Search,
  Utensils,
} from "lucide-react";
import Btn from "./Btn";
import SingleImageField from "./SingleImageField";
import MultiImageField from "./MultiImageField";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import AIPackageParserModal from "./AIPackageParserModal";
import { OFFER_TYPES, offerFoodItems, offerInclusions } from "../../../lib/specialOffers";
import { parseInclusion as parseInclusionDisplay } from "../../../lib/packageDisplay";
import { resolveGroup, CATEGORY_GROUPS } from "../../../lib/menuCategories";
import { DEFAULT_FOOD_CATEGORIES } from "../../../utils/menuCategories";
import QuickInventoryCreateDrawer from "../packages/QuickInventoryCreateDrawer";
import QuickFoodCreateModal from "../packages/QuickFoodCreateModal";

const getDishesForCategory = (menuItems, categoryName) => {
  if (!Array.isArray(menuItems) || !categoryName) return [];
  const target = String(categoryName).trim().toLowerCase();
  if (!target) return [];

  // Match dishes strictly by their actual category (case-insensitive)
  return menuItems.filter(
    (item) => String(item?.category || "").trim().toLowerCase() === target
  );
};

const cleanTextValue = (str) => {
  let val = String(str || "").trim();
  for (let i = 0; i < 4; i++) {
    val = val.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }
  val = val.replace(/^\[+[\s"'\\]*/, "").replace(/[\s"'\\]*\]+$/, "");
  for (let i = 0; i < 4; i++) {
    val = val.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }
  return val;
};

const parseInclusion = (str) => {
  const parsed = parseInclusionDisplay(str);
  if (!parsed) {
    return { category: "Event Setup", name: "", qty: "" };
  }
  return {
    category: parsed.category || "Event Setup",
    name: cleanTextValue(parsed.name),
    qty: parsed.qty || "",
  };
};

function getPackageSnapshot(data, imgFile, galFiles, galRemove) {
  if (!data) return "";
  return JSON.stringify({
    name: String(data.name || "").trim(),
    available: Boolean(data.available),
    guest_min: String(data.guest_min ?? "").trim(),
    guest_max: String(data.guest_max ?? "").trim(),
    guest_count: String(data.guest_count ?? "").trim(),
    setup_price: String(data.setup_price ?? "").trim(),
    price_per_guest: String(data.price_per_guest ?? "").trim(),
    description: String(data.description || "").trim(),
    fullDescription: String(data.fullDescription || "").trim(),
    inclusions: (data.inclusions || [])
      .map((inc) => String(inc || "").trim())
      .filter(Boolean),
    add_ons: (data.add_ons || [])
      .map((a) => ({
        name: String(a?.name || "").trim(),
        qty: String(a?.qty || "").trim(),
      }))
      .filter((a) => a.name || a.qty),
    setup_equipment: (data.setup_equipment || []).map((item) => ({
      name: String(item?.name || "").trim(),
      qty: String(item?.qty || "").trim(),
      category: String(item?.category || "").trim(),
    })),
    scaffold_size_options: (data.scaffold_size_options || []).map((opt) => ({
      label: String(opt?.label || "").trim(),
      width_ft: String(opt?.width_ft ?? "").trim(),
      length_ft: String(opt?.length_ft ?? "").trim(),
      guest_min: String(opt?.guest_min ?? "").trim(),
      guest_max: String(opt?.guest_max ?? "").trim(),
      free_setup: Boolean(opt?.free_setup),
      price: String(opt?.price ?? "").trim(),
    })),
    default_scaffold_option_id: String(data.default_scaffold_option_id || "").trim(),
    offer_food_items: (data.offer_food_items || [])
      .map((item) => ({
        menu_category: String(item?.menu_category || "").trim(),
        item_name: String(item?.item_name || "").trim(),
      }))
      .filter((item) => item.menu_category || item.item_name),
    hasImageFile: Boolean(imgFile),
    galleryFilesCount: (galFiles || []).length,
    galleryToRemove: [...(galRemove || [])].sort(),
  });
}

/**
 * One form for both kinds of package.
 *
 * A Special Offer is the same record with `offer_type: "special"`, sold as a
 * **combo pack**: a fixed meal, for a fixed guest count, at a fixed price per
 * pax. Its food is a list the admin writes out — the combo *is* those dishes —
 * and its inclusions are plain lines rather than inventory classes.
 *
 * A combo is food, so the event-space half of this form — scaffold sizes,
 * setup equipment, the base setup price and package add-ons — does not appear
 * on one and is not saved for one. Those sections belong to a regular package
 * and are unchanged for it. Name, description and media are shared, which is
 * why there is still one form rather than two.
 *
 * `defaultOfferType` is the tab the admin created from, so the form opens
 * already set to the type they were looking at.
 */
/**
 * One row of scaffold inputs, shared by the add form and the in-place editor so
 * the two can never drift apart.
 *
 * There is no price field. A scaffold option is a supported size and the guest
 * range it fits; what that size costs is settled on the quotation.
 *
 * There is no free-set-up flag either. It existed only for Special Offers, back
 * when an offer carried scaffold sizes of its own; an offer is now a combo pack
 * and sells no event space, so nothing can set the flag any more. The field is
 * still read where stored — see Package.scaffold_size_options — so packages
 * configured with it keep displaying and pricing as they always have.
 */
function ScaffoldFields({ value, onChange, compact = false }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const compactInput =
    "w-20 rounded border border-blue-300 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary";
  const compactLabel = "text-xs font-bold text-gray-700";

  if (compact) {
    return (
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={compactLabel}>Size</span>
          <input
            type="number"
            min="1"
            placeholder="Width"
            className={compactInput}
            value={value.width_ft || ""}
            onChange={(e) => set({ width_ft: e.target.value })}
          />
          <span className="text-xs text-gray-400">×</span>
          <input
            type="number"
            min="1"
            placeholder="Length"
            className={compactInput}
            value={value.length_ft || ""}
            onChange={(e) => set({ length_ft: e.target.value })}
          />
          <span className="text-xs text-gray-400">ft</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={compactLabel}>Fits</span>
          <input
            type="number"
            min="0"
            placeholder="Min"
            className={compactInput}
            value={value.guest_min || ""}
            onChange={(e) => set({ guest_min: e.target.value })}
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="number"
            min="0"
            placeholder="Max"
            className={compactInput}
            value={value.guest_max || ""}
            onChange={(e) => set({ guest_max: e.target.value })}
          />
          <span className="text-xs text-gray-400">guests</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={compactLabel}>Base Setup Price</span>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
              ₱
            </span>
            <input
              type="number"
              min="0"
              placeholder="0"
              className="w-28 rounded border border-blue-300 bg-white pl-6 pr-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
              value={value.price !== undefined ? value.price : ""}
              onChange={(e) => set({ price: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          Scaffold Size (ft) <span className="text-red-400">*</span>
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min="1"
            placeholder="Width"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
            value={value.width_ft || ""}
            onChange={(e) => set({ width_ft: e.target.value })}
          />
          <span className="text-gray-400 font-semibold">×</span>
          <input
            type="number"
            min="1"
            placeholder="Length"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
            value={value.length_ft || ""}
            onChange={(e) => set({ length_ft: e.target.value })}
          />
        </div>
        <p className="mt-1 text-[11px] text-gray-400">Width × Length (e.g. 20 × 20)</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          Minimum Guests <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          min="1"
          placeholder="e.g. 50"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          value={value.guest_min || ""}
          onChange={(e) => set({ guest_min: e.target.value })}
        />
        <p className="mt-1 text-[11px] text-gray-400">Min guests allowed for this size</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          Maximum Guests <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          min="1"
          placeholder="e.g. 80"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
          value={value.guest_max || ""}
          onChange={(e) => set({ guest_max: e.target.value })}
        />
        <p className="mt-1 text-[11px] text-gray-400">Max guests allowed for this size</p>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          Base Setup Price (₱) <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
            ₱
          </span>
          <input
            type="number"
            min="0"
            placeholder="e.g. 15000"
            className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-2 text-sm font-bold text-slate-900 focus:border-primary focus:outline-none"
            value={value.price !== undefined ? value.price : ""}
            onChange={(e) => set({ price: e.target.value })}
          />
        </div>
        <p className="mt-1 text-[11px] text-gray-400">Starting setup price for this size</p>
      </div>
    </div>
  );
}

const isSetupCategory = (cat) => {
  const c = String(cat || "").toLowerCase();
  return (
    c.includes("setup") ||
    c.includes("furniture") ||
    c.includes("equipment") ||
    c.includes("decoration")
  );
};

const isDiningCategory = (cat) => {
  const c = String(cat || "").toLowerCase();
  return c.includes("dining") || c.includes("service") || c.includes("tableware");
};

function AutocompleteInput({
  value,
  onChange,
  placeholder,
  candidates = [],
  onSelect,
  onSubmit,
  sourceLabel = "Inventory",
  className = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary",
  disabled = false,
  onCreateNew,
  createActionLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);

  const filteredCandidates = useMemo(() => {
    const trimmed = String(value || "").trim().toLowerCase();
    if (!trimmed) {
      return candidates.slice(0, 10);
    }
    return candidates.filter((item) =>
      item.toLowerCase().includes(trimmed)
    );
  }, [value, candidates]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    onChange(item);
    if (onSelect) onSelect(item);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredCandidates.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      if (!isOpen) return;
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredCandidates.length - 1
      );
    } else if (e.key === "Enter") {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredCandidates.length) {
        e.preventDefault();
        handleSelect(filteredCandidates[highlightedIndex]);
        return;
      }
      if (isOpen) {
        setIsOpen(false);
      }
      if (onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const isAddonSource = sourceLabel.toLowerCase().includes("addon");
  const trimmedValue = String(value || "").trim();
  const hasExactMatch = candidates.some(
    (c) => c.toLowerCase() === trimmedValue.toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1 text-sm">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 flex items-center justify-between">
            <span>Available from {sourceLabel}</span>
            <span className="font-normal font-mono text-[9px]">{filteredCandidates.length} items</span>
          </div>
          {filteredCandidates.length === 0 ? (
            <div className="px-4 py-3.5 text-center text-xs text-gray-500">
              <p className="mb-2 text-gray-600">
                {trimmedValue ? (
                  <>
                    No {isAddonSource ? "add-on" : "inventory item"} found for{" "}
                    <strong className="text-gray-900 font-semibold">"{trimmedValue}"</strong>
                  </>
                ) : (
                  <>No matching items found in {sourceLabel}.</>
                )}
              </p>
              {onCreateNew && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onCreateNew(trimmedValue);
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus size={13} />
                  {createActionLabel ||
                    (isAddonSource
                      ? "+ Create New Add-on"
                      : "+ Create New Inventory Item")}
                </button>
              )}
            </div>
          ) : (
            <>
              {filteredCandidates.map((item, idx) => {
                const isSelected = item.toLowerCase() === trimmedValue.toLowerCase();
                const isHighlighted = highlightedIndex === idx;
                return (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(item);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-1.5 cursor-pointer flex items-center justify-between transition-colors text-xs ${
                      isHighlighted
                        ? "bg-primary/10 text-primary font-medium"
                        : isSelected
                        ? "bg-blue-50/70 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{item}</span>
                    {isSelected && <Check size={12} className="text-primary shrink-0" />}
                  </div>
                );
              })}
              {onCreateNew && trimmedValue && !hasExactMatch && (
                <div className="border-t border-gray-100 p-2 text-center bg-gray-50/70">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onCreateNew(trimmedValue);
                      setIsOpen(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline cursor-pointer"
                  >
                    <Plus size={12} />
                    {createActionLabel ||
                      (isAddonSource
                        ? "+ Create New Add-on"
                        : "+ Create New Inventory Item")}{" "}
                    for "{trimmedValue}"
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function PackageModal({
  pkg,
  onClose,
  onSave,
  defaultOfferType = OFFER_TYPES.REGULAR,
}) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [baseSnapshot, setBaseSnapshot] = useState(null);

  // Dynamic items loaded from actual records
  const [inventoryItems, setInventoryItems] = useState([]);
  const [addonItems, setAddonItems] = useState([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([AdminAPI.getInventory(), AdminAPI.getAddons()])
      .then(([invRes, addRes]) => {
        if (!mounted) return;
        setInventoryItems(invRes.data || []);
        setAddonItems(addRes.data || []);
      })
      .catch((err) => {
        console.error("Failed to load inventory or addons:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const allInventoryItemNames = useMemo(() => {
    return inventoryItems
      .filter((item) => item.item_name)
      .map((item) => item.item_name.trim());
  }, [inventoryItems]);

  const setupInventoryItems = useMemo(() => {
    return inventoryItems
      .filter((item) => isSetupCategory(item.category) && item.item_name)
      .map((item) => item.item_name.trim());
  }, [inventoryItems]);

  const diningInventoryItems = allInventoryItemNames;

  const addonNames = useMemo(() => {
    return addonItems
      .filter((item) => item.name)
      .map((item) => item.name.trim());
  }, [addonItems]);

  // ============ FORM STATE ============
  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    package_type: "Event Setup Only",
    // Regular package or Special Offer. Decides which fields below mean
    // anything, and which tab the record lands under in the admin.
    offer_type: defaultOfferType,
    event_type: "",
    event_type_other: "",
    available: true,

    // Guest & Capacity
    guest_min: "",
    guest_max: "",
    // Special Offers only: how many guests the combo serves. Not a range and
    // not a cap — it is the number the price is built from.
    guest_count: "",

    // Pricing
    setup_price: "",
    // Special Offers only: the fixed price per pax.
    price_per_guest: "",

    // Special Offers only: the combo's food, exactly as it is served.
    offer_food_items: [],

    // Descriptions
    description: "",
    fullDescription: "",

    // Inclusions & Add-ons
    inclusions: [],
    add_ons: [],

    // Setup Equipment (Event Setup packages)
    setup_equipment: [],
    scaffold_size_options: [],
    default_scaffold_option_id: "",
  });

  const [activeClassTab, setActiveClassTab] = useState("setup"); // 'setup' | 'inventory' | 'addons'

  // Foldable/collapsible states for presets & active item lists
  const [showPresets, setShowPresets] = useState({
    setup: false,
    inventory: true,
    dining: true,
    addons: true,
  });
  const [showItemsList, setShowItemsList] = useState({
    setup: true,
    staff: true,
    inventory: true,
    dining: true,
    addons: true,
  });

  const togglePresets = (cat) => {
    setShowPresets((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleItemsList = (cat) => {
    setShowItemsList((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const [setupInput, setSetupInput] = useState({ name: "", qty: "" });
  const [staffInput, setStaffInput] = useState({ name: "", qty: "1" });
  const [inventoryInput, setInventoryInput] = useState({ name: "", qty: "" });
  const diningInput = inventoryInput;
  const setDiningInput = setInventoryInput;
  const [addOnInput, setAddOnInput] = useState({
    name: "",
    qty: "",
  });

  // Combo inclusions are plain lines ("Buffet setup"), typed one at a time.
  const [comboInclusionInput, setComboInclusionInput] = useState("");
  const [editingComboInclusionIdx, setEditingComboInclusionIdx] = useState(null);
  const [editComboInclusionValue, setEditComboInclusionValue] = useState("");



  // Quick In-Place Creation Drawer state for missing inventory / add-ons
  const [quickDrawer, setQuickDrawer] = useState({
    isOpen: false,
    initialName: "",
    category: "Event Setup & Furniture",
    isAddon: false,
  });

  const handleOpenQuickCreate = (name = "", category = "Event Setup & Furniture", isAddon = false) => {
    setQuickDrawer({
      isOpen: true,
      initialName: name || "",
      category: category || "Event Setup & Furniture",
      isAddon: Boolean(isAddon),
    });
  };

  const handleQuickCreateSuccess = (createdEntity, packageQty) => {
    if (quickDrawer.isAddon) {
      setAddonItems((prev) => [...prev, createdEntity]);
      setFormData((prev) => ({
        ...prev,
        add_ons: [
          ...(prev.add_ons || []),
          {
            name: createdEntity.name,
            qty: String(packageQty || "1"),
          },
        ],
      }));
      setAddOnInput({ name: "", qty: "" });
      setShowItemsList((prev) => ({ ...prev, addons: true }));
    } else {
      setInventoryItems((prev) => [...prev, createdEntity]);
      const incStr = `[Inventory] ${createdEntity.item_name} (${packageQty || 1})`;
      setFormData((prev) => ({
        ...prev,
        inclusions: [...(prev.inclusions || []), incStr],
      }));
      setInventoryInput({ name: "", qty: "" });
      setShowItemsList((prev) => ({ ...prev, inventory: true, dining: true }));
    }
  };

  // Track currently selected inventory items to derive their live Total Quantity
  const selectedInvItem = useMemo(() => {
    const clean = cleanTextValue(inventoryInput.name).toLowerCase();
    if (!clean) return null;
    return (
      inventoryItems.find(
        (item) => item.item_name && item.item_name.trim().toLowerCase() === clean
      ) || null
    );
  }, [inventoryInput.name, inventoryItems]);

  const selectedSetupInvItem = selectedInvItem;
  const selectedDiningInvItem = selectedInvItem;


  const [newScaffoldOption, setNewScaffoldOption] = useState({
    label: "",
    width_ft: "",
    length_ft: "",
    guest_min: "",
    guest_max: "",
    price: "",
    free_setup: false,
  });

  // ============ COMBO FOOD CATEGORY GROUPING STATE ============
  const [customCategoryHeaders, setCustomCategoryHeaders] = useState([]);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryNameValue, setEditCategoryNameValue] = useState("");
  const [categoryInputs, setCategoryInputs] = useState({});

  // Quick In-Place Creation Modal state for missing food items
  const [quickFoodModal, setQuickFoodModal] = useState({
    isOpen: false,
    initialName: "",
    category: "",
  });

  const handleOpenQuickCreateFood = (name = "", category = "") => {
    setQuickFoodModal({
      isOpen: true,
      initialName: name ? String(name).trim() : "",
      category: category ? String(category).trim() : "",
    });
  };

  const handleQuickCreateFoodSuccess = (createdItem) => {
    const targetCategory =
      createdItem?.category?.trim() ||
      quickFoodModal.category?.trim() ||
      "Main Course";

    setQuickFoodModal({
      isOpen: false,
      initialName: "",
      category: "",
    });

    if (!createdItem || !createdItem.name) return;

    // 1. Update local catalog (menuItems) so the dish is immediately available everywhere
    setMenuItems((prev) => {
      const exists = prev.some(
        (m) =>
          (m._id && createdItem._id && m._id === createdItem._id) ||
          (m.name || "").trim().toLowerCase() === (createdItem.name || "").trim().toLowerCase()
      );
      if (exists) return prev;
      return [...prev, createdItem];
    });

    // 2. Ensure targetCategory is present in customCategoryHeaders
    setCustomCategoryHeaders((prev) => {
      if (prev.some((c) => c.toLowerCase() === targetCategory.toLowerCase())) {
        return prev;
      }
      return [...prev, targetCategory];
    });

    // 3. Immediately add the new dish to offer_food_items under targetCategory
    setFormData((prev) => {
      const currentItems = prev.offer_food_items || [];
      const isAlreadyAdded = currentItems.some(
        (item) =>
          (item.menu_category || "").trim().toLowerCase() === targetCategory.toLowerCase() &&
          (item.item_name || "").trim().toLowerCase() === (createdItem.name || "").trim().toLowerCase()
      );
      if (isAlreadyAdded) return prev;
      return {
        ...prev,
        offer_food_items: [
          ...currentItems.filter((item) => item.item_name?.trim()),
          {
            menu_category: targetCategory,
            item_name: createdItem.name.trim(),
          },
        ],
      };
    });

    // 4. Expand targetCategory so admin sees the new dish immediately
    setCollapsedCategories((prev) => ({
      ...prev,
      [targetCategory]: false,
    }));

    notify(`Food "${createdItem.name}" created and added to ${targetCategory}.`, "success");
  };

  // ============ MEDIA STATE ============
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  // Saved gallery URLs the admin marked for deletion — only sent on submit.
  const [galleryToRemove, setGalleryToRemove] = useState([]);

  // ============ EFFECTS ============
  useEffect(() => {
    setGalleryToRemove([]);
    setImageFile(null);
    setGalleryFiles([]);

    if (pkg) {
      // Normalize add_ons
      const normalizedAddOns = (pkg.add_ons || []).map((a) => ({
        name: a.name || (typeof a === "string" ? a : ""),
        qty: a.qty || "",
      }));

      const initialData = {
        name: pkg.name || "",
        package_type: pkg.package_type || "Event Setup Only",
        // A saved package keeps its own type. Records written before Special
        // Offers existed have none, and are regular packages.
        offer_type:
          pkg.offer_type === OFFER_TYPES.SPECIAL
            ? OFFER_TYPES.SPECIAL
            : OFFER_TYPES.REGULAR,
        event_type: pkg.event_type || "",
        event_type_other: "",
        available: pkg.available !== false,
        guest_min: pkg.guest_min || "",
        guest_max: pkg.guest_max || "",
        guest_count: pkg.guest_count || "",
        setup_price: pkg.setup_price || "",
        price_per_guest: pkg.price_per_guest || "",
        // Reopened in the order it was saved in, which is the order the combo
        // is served and displayed in.
        offer_food_items: offerFoodItems(pkg).map((item) => ({
          menu_category: cleanTextValue(item.menu_category),
          item_name: cleanTextValue(item.item_name),
        })),
        description: pkg.description || "",
        fullDescription: pkg.fullDescription || "",
        // A combo's inclusions are plain lines; anything saved with an old
        // inventory-class prefix reads back without it.
        inclusions:
          pkg.offer_type === OFFER_TYPES.SPECIAL
            ? offerInclusions(pkg)
            : (Array.isArray(pkg.inclusions) ? pkg.inclusions : [])
                .map((inc) => {
                  const p = parseInclusion(inc);
                  if (!p.name) return "";
                  const q = p.qty ? ` (${p.qty})` : "";
                  return `[${p.category}] ${p.name}${q}`;
                })
                .filter(Boolean)
                .filter((inc, idx, arr) => arr.indexOf(inc) === idx),
        add_ons: normalizedAddOns.map((addon) => ({
          ...addon,
          name: cleanTextValue(addon.name),
        })),
        setup_equipment: pkg.setup_equipment || [],
        scaffold_size_options: pkg.scaffold_size_options || [],
        default_scaffold_option_id: pkg.default_scaffold_option_id || "",
      };

      setFormData(initialData);
      setBaseSnapshot(getPackageSnapshot(initialData, null, [], []));
    } else {
      // A brand new record starts as whichever tab it was created from.
      setFormData((prev) => ({ ...prev, offer_type: defaultOfferType }));
      setBaseSnapshot(null);
    }
  }, [pkg, defaultOfferType]);

  // The kitchen's real catalogue. A combo's dishes are typed rather than
  // picked — a combo may serve something that is not a standing menu item —
  // but the catalogue is offered as suggestions, so the usual case is one
  // keystroke and the names stay consistent with the menu.
  const [menuItems, setMenuItems] = useState([]);
  useEffect(() => {
    AdminAPI.getMenu()
      .then((res) => setMenuItems(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMenuItems([]));
  }, []);

  const isOffer = formData.offer_type === OFFER_TYPES.SPECIAL;
  const scaffoldOptions = formData.scaffold_size_options || [];

  // Determine if editable fields have been modified compared to original state
  const isDirty = useMemo(() => {
    if (!pkg || !baseSnapshot) return false;
    const current = getPackageSnapshot(
      formData,
      imageFile,
      galleryFiles,
      galleryToRemove,
    );
    return current !== baseSnapshot;
  }, [pkg, baseSnapshot, formData, imageFile, galleryFiles, galleryToRemove]);

  const foodItems = useMemo(
    () => formData.offer_food_items || [],
    [formData.offer_food_items],
  );

  // Group food items dynamically by menu category
  const categoryGroups = useMemo(() => {
    const items = formData.offer_food_items || [];
    const categoryMap = new Map();

    items.forEach((item, globalIndex) => {
      const cat = String(item.menu_category || "").trim() || "Uncategorized";
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      categoryMap.get(cat).push({ ...item, globalIndex });
    });

    customCategoryHeaders.forEach((cat) => {
      const trimmed = String(cat || "").trim();
      if (trimmed && !categoryMap.has(trimmed)) {
        categoryMap.set(trimmed, []);
      }
    });

    return Array.from(categoryMap.entries()).map(([name, catItems]) => ({
      name,
      items: catItems,
    }));
  }, [formData.offer_food_items, customCategoryHeaders]);

  // A newly added row is scrolled to and focused, so "Add" from the foot of a
  // long list lands the admin on the thing they just created rather than
  // somewhere above it.
  const foodRowRefs = useRef({});
  const pendingFoodFocus = useRef(null);

  const registerFoodRow = (index, node) => {
    if (node) foodRowRefs.current[index] = node;
    else delete foodRowRefs.current[index];
  };

  useEffect(() => {
    const index = pendingFoodFocus.current;
    if (index === null || index === undefined) return;
    pendingFoodFocus.current = null;
    const node = foodRowRefs.current[index];
    node?.scrollIntoView({ block: "center", behavior: "smooth" });
    node?.querySelector("input")?.focus();
  }, [foodItems.length]);

  // Any package can support multiple scaffold sizes, each with its own
  // guest limits and base setup price.
  const canAddScaffold = true;

  // Menu items grouped the way the customer-facing menu reads, so the dish
  // suggestions under "Chicken BBQ" are the mains the kitchen actually sells.
  const menuByGroup = useMemo(() => {
    const groups = new Map();
    menuItems.forEach((item) => {
      const group = resolveGroup(item.category);
      if (!groups.has(group.id)) groups.set(group.id, { ...group, items: [] });
      groups.get(group.id).items.push(item);
    });
    return [...groups.values()];
  }, [menuItems]);

  /**
   * The course names offered on a combo food row.
   *
   * The shared taxonomy first — it is the vocabulary the rest of the product
   * groups food by — then any course the kitchen already uses that it does not
   * cover, so an admin never has to invent a name the menu already has. The
   * field stays free text: a combo may serve something the menu does not list.
   */
  const categorySuggestions = useMemo(() => {
    const names = CATEGORY_GROUPS.map((group) => group.label);
    const seen = new Set(names.map((name) => name.toLowerCase()));
    menuByGroup.forEach((group) => {
      if (group.label && !seen.has(group.label.toLowerCase())) {
        seen.add(group.label.toLowerCase());
        names.push(group.label);
      }
    });
    return names;
  }, [menuByGroup]);

  // Dynamically derive all categories from catalog + existing default food categories
  const allKnownCategories = useMemo(() => {
    const catsFromMenu = menuItems
      .map((m) => String(m?.category || "").trim())
      .filter(Boolean);
    const combined = [...DEFAULT_FOOD_CATEGORIES, ...catsFromMenu];
    const unique = [];
    const seen = new Set();
    combined.forEach((c) => {
      const lower = c.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        unique.push(c);
      }
    });
    return unique;
  }, [menuItems]);

  const availableCategoriesToAdd = useMemo(() => {
    const activeCats = new Set(
      categoryGroups.map((g) => g.name.toLowerCase().trim())
    );
    return allKnownCategories.filter(
      (cat) => !activeCats.has(cat.toLowerCase().trim())
    );
  }, [allKnownCategories, categoryGroups]);

  /** Dish suggestions for a row, narrowed to its course when it names one. */
  const dishSuggestionsFor = (category) => {
    const wanted = String(category || "").trim().toLowerCase();
    const group = wanted
      ? menuByGroup.find((entry) => entry.label.toLowerCase() === wanted)
      : null;
    const pool = group ? group.items : menuItems;
    return [...new Set(pool.map((item) => item.name).filter(Boolean))];
  };

  // ============ INCLUSION HELPERS & CATEGORIZATION ============


  const isStaffInclusion = (incStr) => {
    const parsed = parseInclusion(incStr);
    const cat = String(parsed.category || "").toLowerCase().trim();
    return (
      cat === "staff & personnel" ||
      cat === "staff" ||
      cat === "personnel"
    );
  };

  const isEventSetupInclusion = (incStr) => {
    if (isStaffInclusion(incStr)) return false;
    const parsed = parseInclusion(incStr);
    const cat = String(parsed.category || "").toLowerCase().trim();
    if (cat === "event setup" || cat === "services") return true;
    if (cat === "inventory" || cat.includes("dining") || cat.includes("service inventory")) return false;

    // For legacy "[Event Setup & Furniture]" or uncategorized inclusions:
    const cleanName = parsed.name.toLowerCase().trim();
    const isTrackedInv = inventoryItems.some(
      (item) => item.item_name && item.item_name.trim().toLowerCase() === cleanName
    );
    if (isTrackedInv && parsed.qty) {
      return false;
    }
    return true;
  };

  const isInventoryInclusion = (incStr) =>
    !isEventSetupInclusion(incStr) && !isStaffInclusion(incStr);
  const isDiningInclusion = isInventoryInclusion;

  const handleAddSetupInclusion = (customName) => {
    const rawName = customName || setupInput.name;
    const nameToAdd = cleanTextValue(rawName);
    if (!nameToAdd) return;

    // Prevent duplicates in Event Setup
    const alreadyExists = (formData.inclusions || []).some((inc) => {
      const p = parseInclusion(inc);
      return (
        isEventSetupInclusion(inc) &&
        p.name.toLowerCase() === nameToAdd.toLowerCase()
      );
    });

    if (alreadyExists) {
      notify(`"${nameToAdd}" is already added to Event Setup inclusions.`, "info");
      return;
    }

    const incStr = `[Event Setup] ${nameToAdd}`;

    setFormData((prev) => ({
      ...prev,
      inclusions: [...(prev.inclusions || []), incStr],
    }));

    setSetupInput({ name: "", qty: "" });
    setShowItemsList((prev) => ({ ...prev, setup: true }));
  };

  const handleAddStaffInclusion = (customName, customQty) => {
    const rawName = customName || staffInput.name;
    const nameToAdd = cleanTextValue(rawName);
    if (!nameToAdd) return;

    const rawQty = (customQty != null ? String(customQty) : staffInput.qty || "").trim() || "1";
    let qtyNum = parseInt(rawQty, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      qtyNum = 1;
    }

    // Check if this staff item already exists in Staff & Personnel
    const existingStaffInc = (formData.inclusions || []).find((inc) => {
      const p = parseInclusion(inc);
      return (
        isStaffInclusion(inc) &&
        p.name.toLowerCase() === nameToAdd.toLowerCase()
      );
    });

    if (existingStaffInc) {
      const parsed = parseInclusion(existingStaffInc);
      const currentQty = parseInt(parsed.qty, 10) || 1;
      const nextQty = currentQty + qtyNum;
      const newIncStr = `[Staff & Personnel] ${parsed.name} (${nextQty})`;
      setFormData((prev) => ({
        ...prev,
        inclusions: prev.inclusions.map((inc) => (inc === existingStaffInc ? newIncStr : inc)),
      }));
      notify(`Updated "${nameToAdd}" quantity to ${nextQty}.`, "info");
      setStaffInput({ name: "", qty: "1" });
      return;
    }

    const incStr = `[Staff & Personnel] ${nameToAdd} (${qtyNum})`;

    setFormData((prev) => ({
      ...prev,
      inclusions: [...(prev.inclusions || []), incStr],
    }));

    setStaffInput({ name: "", qty: "1" });
    setShowItemsList((prev) => ({ ...prev, staff: true }));
  };

  const handleStepStaffQty = (incStr, step) => {
    const parsed = parseInclusion(incStr);
    if (!parsed.name) return;
    const currentQty = parseInt(parsed.qty, 10) || 1;
    const newQty = Math.max(1, currentQty + step);
    const newIncStr = `[Staff & Personnel] ${parsed.name} (${newQty})`;
    setFormData((prev) => ({
      ...prev,
      inclusions: (prev.inclusions || []).map((inc) => (inc === incStr ? newIncStr : inc)),
    }));
  };

  const handleUpdateStaffQty = (incStr, newQtyRaw) => {
    const parsed = parseInclusion(incStr);
    if (!parsed.name) return;
    let qtyNum = parseInt(newQtyRaw, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      qtyNum = 1;
    }
    const newIncStr = `[Staff & Personnel] ${parsed.name} (${qtyNum})`;
    setFormData((prev) => ({
      ...prev,
      inclusions: (prev.inclusions || []).map((inc) => (inc === incStr ? newIncStr : inc)),
    }));
  };

  const handleAddInventoryInclusion = (customName) => {
    const rawName = customName || inventoryInput.name;
    const nameToAdd = cleanTextValue(rawName);
    if (!nameToAdd) return;

    const matched = allInventoryItemNames.find(
      (item) => item.toLowerCase() === nameToAdd.toLowerCase()
    );
    if (!matched) {
      handleOpenQuickCreate(nameToAdd, "Dining & Service Inventory", false);
      return;
    }

    const invItem = inventoryItems.find(
      (item) => item.item_name && item.item_name.trim().toLowerCase() === matched.toLowerCase()
    );
    const maxQty = invItem?.quantity != null ? invItem.quantity : null;

    // If already added, predictably increment its package quantity
    const existingInc = (formData.inclusions || []).find((inc) => {
      const p = parseInclusion(inc);
      return !isEventSetupInclusion(inc) && p.name.toLowerCase() === matched.toLowerCase();
    });

    if (existingInc) {
      const parsed = parseInclusion(existingInc);
      const currentQty = parseInt(parsed.qty, 10) || 1;
      const nextQty = currentQty + 1;
      if (maxQty != null && nextQty > maxQty) {
        notify(`Maximum available Total Quantity in inventory is ${maxQty}.`, "info");
        return;
      }
      const cat =
        parsed.category && parsed.category.toLowerCase() !== "event setup & furniture"
          ? parsed.category
          : "Inventory";
      const newIncStr = `[${cat}] ${parsed.name} (${nextQty})`;
      setFormData((prev) => ({
        ...prev,
        inclusions: prev.inclusions.map((inc) => (inc === existingInc ? newIncStr : inc)),
      }));
      notify(`Incremented "${matched}" quantity to ${nextQty}.`, "info");
      return;
    }

    const rawQty = (inventoryInput.qty || "").trim() || "1";
    const qtyNum = parseInt(rawQty, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      notify("Quantity must be at least 1.", "error");
      return;
    }
    if (maxQty != null && qtyNum > maxQty) {
      notify(`Maximum available Total Quantity is ${maxQty}.`, "error");
      return;
    }

    const incStr = `[Inventory] ${matched} (${qtyNum})`;

    setFormData((prev) => ({
      ...prev,
      inclusions: [...(prev.inclusions || []), incStr],
    }));

    setInventoryInput({ name: "", qty: "" });
    setShowItemsList((prev) => ({ ...prev, inventory: true, dining: true }));
  };

  const handleAddDiningInclusion = handleAddInventoryInclusion;

  const handleUpdateInclusionQty = (incStr, newQtyRaw) => {
    const parsed = parseInclusion(incStr);
    if (!parsed.name) return;

    const invItem = inventoryItems.find(
      (item) => item.item_name && item.item_name.trim().toLowerCase() === parsed.name.toLowerCase()
    );
    const maxQty = invItem?.quantity != null ? invItem.quantity : null;

    const cat =
      parsed.category && parsed.category.toLowerCase() !== "event setup & furniture"
        ? parsed.category
        : "Inventory";

    const rawStr = String(newQtyRaw ?? "");
    const trimmed = rawStr.trim();

    // 1. Allow completely clearing the field while admin is editing
    if (trimmed === "") {
      const newIncStr = `[${cat}] ${parsed.name} ()`;
      setFormData((prev) => ({
        ...prev,
        inclusions: (prev.inclusions || []).map((inc) => (inc === incStr ? newIncStr : inc)),
      }));
      return;
    }

    // 2. Reject negative numbers
    if (trimmed.includes("-") || Number(trimmed) < 0) {
      notify("Quantity must be at least 1.", "error");
      return;
    }

    const qtyNum = parseInt(trimmed, 10);
    if (isNaN(qtyNum)) {
      notify("Quantity must be at least 1.", "error");
      return;
    }

    // 3. Keep existing inventory quantity limit / availability validation intact
    let finalQty = qtyNum;
    if (maxQty != null && qtyNum > maxQty) {
      finalQty = maxQty;
      notify(`Maximum available Total Quantity in inventory is ${maxQty}.`, "info");
    }

    const newIncStr = `[${cat}] ${parsed.name} (${finalQty})`;
    setFormData((prev) => ({
      ...prev,
      inclusions: (prev.inclusions || []).map((inc) => (inc === incStr ? newIncStr : inc)),
    }));
  };

  const handleStepInclusionQty = (incStr, step) => {
    const parsed = parseInclusion(incStr);
    if (!parsed.name) return;

    const invItem = inventoryItems.find(
      (item) => item.item_name && item.item_name.trim().toLowerCase() === parsed.name.toLowerCase()
    );
    const maxQty = invItem?.quantity != null ? invItem.quantity : null;

    const rawQty = parsed.qty != null ? String(parsed.qty).trim() : "";
    const currentQty = parseInt(rawQty, 10);
    const baseQty = isNaN(currentQty) || currentQty < 1 ? 1 : currentQty;
    let nextQty = baseQty + step;
    if (nextQty < 1) nextQty = 1;
    if (maxQty != null && nextQty > maxQty) {
      nextQty = maxQty;
      notify(`Maximum available Total Quantity in inventory is ${maxQty}.`, "info");
    }

    const cat =
      parsed.category && parsed.category.toLowerCase() !== "event setup & furniture"
        ? parsed.category
        : "Inventory";
    const newIncStr = `[${cat}] ${parsed.name} (${nextQty})`;
    setFormData((prev) => ({
      ...prev,
      inclusions: (prev.inclusions || []).map((inc) => (inc === incStr ? newIncStr : inc)),
    }));
  };

  const handleRemoveInclusionString = (targetStr) => {
    setFormData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.filter((inc) => inc !== targetStr),
    }));
  };


  // ============ HANDLERS - Add-ons ============
  const handleAddAddOn = (presetName) => {
    const rawName = presetName || addOnInput.name;
    const nameToAdd = cleanTextValue(rawName);
    if (!nameToAdd) return;

    const matched = addonNames.find(
      (item) => item.toLowerCase() === nameToAdd.toLowerCase()
    );
    if (!matched) {
      handleOpenQuickCreate(nameToAdd, "Event Setup & Furniture", true);
      return;
    }

    const existing = (formData.add_ons || []).find(
      (addon) => cleanTextValue(addon.name).toLowerCase() === matched.toLowerCase()
    );
    if (existing) {
      const currentQty = parseInt(existing.qty, 10) || 1;
      const nextQty = String(currentQty + 1);
      setFormData((prev) => ({
        ...prev,
        add_ons: (prev.add_ons || []).map((addon) =>
          cleanTextValue(addon.name).toLowerCase() === matched.toLowerCase()
            ? { ...addon, qty: nextQty }
            : addon
        ),
      }));
      notify(`Incremented "${matched}" quantity to ${nextQty}.`, "info");
      return;
    }

    const rawQty = (addOnInput.qty || "").trim() || "1";

    setFormData((prev) => ({
      ...prev,
      add_ons: [
        ...(prev.add_ons || []),
        {
          name: matched,
          qty: rawQty,
        },
      ],
    }));

    setAddOnInput({
      name: "",
      qty: "",
    });
    setShowItemsList((prev) => ({ ...prev, addons: true }));
  };

  const handleUpdateAddOnQty = (index, newQtyRaw) => {
    let qtyNum = parseInt(newQtyRaw, 10);
    if (isNaN(qtyNum) || qtyNum < 1) {
      qtyNum = 1;
    }
    setFormData((prev) => {
      const next = [...(prev.add_ons || [])];
      if (next[index]) {
        next[index] = { ...next[index], qty: String(qtyNum) };
      }
      return { ...prev, add_ons: next };
    });
  };

  const handleStepAddOnQty = (index, step) => {
    const current = formData.add_ons?.[index];
    const currentQty = parseInt(current?.qty, 10) || 1;
    handleUpdateAddOnQty(index, currentQty + step);
  };

  const handleRemoveAddOn = (index) => {
    setFormData((prev) => ({
      ...prev,
      add_ons: prev.add_ons.filter((_, i) => i !== index),
    }));
  };



  const SCAFFOLD_PRESETS = [
    { label: "20x20 Setup", width_ft: 20, length_ft: 20, guest_min: 50, guest_max: 80, price: "" },
    { label: "20x40 Setup", width_ft: 20, length_ft: 40, guest_min: 81, guest_max: 120, price: "" },
    { label: "40x40 Setup", width_ft: 40, length_ft: 40, guest_min: 121, guest_max: 200, price: "" },
    { label: "20x60 Setup", width_ft: 20, length_ft: 60, guest_min: 180, guest_max: 250, price: "" },
    { label: "40x60 Setup", width_ft: 40, length_ft: 60, guest_min: 250, guest_max: 350, price: "" },
  ];

  const [editingScaffoldIdx, setEditingScaffoldIdx] = useState(null);
  const [editScaffoldData, setEditScaffoldData] = useState({
    label: "",
    width_ft: "",
    length_ft: "",
    guest_min: "",
    guest_max: "",
    price: "",
    free_setup: false,
  });

  // ============ HANDLERS - Scaffold Options ============
  const handleAddScaffoldOption = () => {
    const { label, width_ft, length_ft, guest_min, guest_max, price, free_setup } =
      newScaffoldOption;
    if (!width_ft || !length_ft) return;
    const area = Number(width_ft) * Number(length_ft);
    const nextLabel = label || `${Number(width_ft)}x${Number(length_ft)} Setup`;
    setFormData((prev) => ({
      ...prev,
      scaffold_size_options: [
        ...(prev.scaffold_size_options || []),
        {
          label: nextLabel,
          width_ft: Number(width_ft),
          length_ft: Number(length_ft),
          area_ft2: area,
          guest_min: guest_min ? Number(guest_min) : undefined,
          guest_max: guest_max ? Number(guest_max) : undefined,
          price: price !== undefined && price !== "" ? Number(price) : 0,
          free_setup: Boolean(free_setup),
        },
      ],
    }));
    setNewScaffoldOption({
      label: "",
      width_ft: "",
      length_ft: "",
      guest_min: "",
      guest_max: "",
      price: "",
      free_setup: false,
    });
  };

  const handleRemoveScaffoldOption = (index) => {
    setFormData((prev) => {
      const nextOptions = (prev.scaffold_size_options || []).filter(
        (_, i) => i !== index,
      );
      const removed = prev.scaffold_size_options?.[index];
      return {
        ...prev,
        scaffold_size_options: nextOptions,
        default_scaffold_option_id:
          removed && String(prev.default_scaffold_option_id) === String(removed._id)
            ? ""
            : prev.default_scaffold_option_id,
      };
    });
    setEditingScaffoldIdx(null);
  };

  const handleStartEditScaffold = (idx, opt) => {
    setEditingScaffoldIdx(idx);
    setEditScaffoldData({
      label: opt.label || "",
      width_ft: opt.width_ft || "",
      length_ft: opt.length_ft || "",
      guest_min: opt.guest_min || "",
      guest_max: opt.guest_max || "",
      price: opt.price !== undefined ? opt.price : "",
      free_setup: Boolean(opt.free_setup),
    });
  };

  const handleSaveEditScaffold = (idx) => {
    const { width_ft, length_ft, guest_min, guest_max, price, free_setup } =
      editScaffoldData;
    if (!width_ft || !length_ft) return;
    const area = Number(width_ft) * Number(length_ft);
    const nextLabel = `${Number(width_ft)}x${Number(length_ft)} Setup`;

    setFormData((prev) => {
      const nextOptions = [...(prev.scaffold_size_options || [])];
      nextOptions[idx] = {
        ...nextOptions[idx],
        label: nextLabel,
        width_ft: Number(width_ft),
        length_ft: Number(length_ft),
        area_ft2: area,
        guest_min: guest_min ? Number(guest_min) : undefined,
        guest_max: guest_max ? Number(guest_max) : undefined,
        price: price !== undefined && price !== "" ? Number(price) : 0,
        free_setup: Boolean(free_setup),
      };
      return { ...prev, scaffold_size_options: nextOptions };
    });

    setEditingScaffoldIdx(null);
  };

  const handleCancelEditScaffold = () => {
    setEditingScaffoldIdx(null);
  };

  const handleApplyScaffoldPreset = (preset) => {
    setNewScaffoldOption((prev) => ({
      ...prev,
      label: preset.label,
      width_ft: preset.width_ft,
      length_ft: preset.length_ft,
      guest_min: preset.guest_min,
      guest_max: preset.guest_max,
      price: preset.price !== undefined && preset.price !== "" ? preset.price : prev.price,
    }));
  };

  // ============ HANDLERS - Combo food & category grouping ============
  const handleAddFoodItemToCategory = (catName) => {
    const realCategory = catName === "Uncategorized" ? "" : catName;
    setFormData((prev) => {
      const items = prev.offer_food_items || [];
      return {
        ...prev,
        offer_food_items: [...items, { menu_category: realCategory, item_name: "" }],
      };
    });
    setCollapsedCategories((prev) => ({ ...prev, [catName]: false }));
  };

  const handleAddDishToCategory = (catName, dishName) => {
    const trimmed = cleanTextValue(dishName);
    if (!trimmed) return;

    const items = formData.offer_food_items || [];
    const isDuplicate = items.some(
      (item) =>
        (item.menu_category || "").trim().toLowerCase() === catName.trim().toLowerCase() &&
        (item.item_name || "").trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      notify(`"${trimmed}" is already added under ${catName}.`, "error");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      offer_food_items: [
        ...(prev.offer_food_items || []).filter((i) => i.item_name?.trim()),
        { menu_category: catName, item_name: trimmed },
      ],
    }));

    setCategoryInputs((prev) => ({ ...prev, [catName]: "" }));
  };

  const handleAddNewCategory = (catName) => {
    const name = cleanTextValue(catName);
    if (!name) return;

    const lowerName = name.toLowerCase();
    const alreadyInGroups = categoryGroups.some(
      (g) => g.name.toLowerCase().trim() === lowerName
    );

    if (alreadyInGroups) {
      notify(`Category "${name}" is already in this package.`, "info");
      setCollapsedCategories((prev) => ({ ...prev, [name]: false }));
      setIsAddingCategory(false);
      setNewCategoryName("");
      return;
    }

    if (!customCategoryHeaders.some((c) => c.toLowerCase() === lowerName)) {
      setCustomCategoryHeaders((prev) => [...prev, name]);
    }
    setCollapsedCategories((prev) => ({ ...prev, [name]: false }));
    setNewCategoryName("");
    setIsAddingCategory(false);
  };

  const handleMoveFoodItemWithinCategory = (catName, itemInCatIndex, direction) => {
    const categoryGroup = categoryGroups.find((g) => g.name === catName);
    if (!categoryGroup) return;

    const catItems = categoryGroup.items;
    const targetInCatIndex = itemInCatIndex + direction;
    if (targetInCatIndex < 0 || targetInCatIndex >= catItems.length) return;

    const currentGlobalIdx = catItems[itemInCatIndex].globalIndex;
    const targetGlobalIdx = catItems[targetInCatIndex].globalIndex;

    setFormData((prev) => {
      const items = [...(prev.offer_food_items || [])];
      [items[currentGlobalIdx], items[targetGlobalIdx]] = [
        items[targetGlobalIdx],
        items[currentGlobalIdx],
      ];
      return { ...prev, offer_food_items: items };
    });
  };

  const handleRemoveCategoryGroup = (catName) => {
    setFormData((prev) => ({
      ...prev,
      offer_food_items: (prev.offer_food_items || []).filter(
        (item) => (String(item.menu_category || "").trim() || "Uncategorized") !== catName,
      ),
    }));
    setCustomCategoryHeaders((prev) => prev.filter((c) => c !== catName));
  };

  const handleRenameCategoryGroup = (oldCatName, newCatName) => {
    const trimmedNew = String(newCatName || "").trim();
    if (!trimmedNew || oldCatName === trimmedNew) {
      setEditingCategory(null);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      offer_food_items: (prev.offer_food_items || []).map((item) => {
        const currentCat = String(item.menu_category || "").trim() || "Uncategorized";
        if (currentCat === oldCatName) {
          return { ...item, menu_category: trimmedNew };
        }
        return item;
      }),
    }));
    setCustomCategoryHeaders((prev) =>
      prev.map((c) => (c === oldCatName ? trimmedNew : c)),
    );
    setEditingCategory(null);
  };

  const toggleCollapseCategory = (catName) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  const handleAddFoodItem = () => {
    handleAddFoodItemToCategory(categoryGroups[0]?.name || "Viand");
  };

  const handleUpdateFoodItem = (index, patch) => {
    setFormData((prev) => {
      const items = [...(prev.offer_food_items || [])];
      items[index] = { ...items[index], ...patch };
      return { ...prev, offer_food_items: items };
    });
  };

  const handleRemoveFoodItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      offer_food_items: (prev.offer_food_items || []).filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const handleMoveFoodItem = (index, direction) => {
    setFormData((prev) => {
      const items = [...(prev.offer_food_items || [])];
      const target = index + direction;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return { ...prev, offer_food_items: items };
    });
  };

  // Combo inclusions: plain free-text entries managed directly inside the combo
  const handleAddComboInclusion = (overrideValue) => {
    const rawValue = typeof overrideValue === "string" ? overrideValue : comboInclusionInput;
    const value = cleanTextValue(rawValue);
    if (!value) return;

    const existing = formData.inclusions || [];
    if (existing.some((entry) => cleanTextValue(entry).toLowerCase() === value.toLowerCase())) {
      notify(`"${value}" is already included.`, "info");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      inclusions: [...(prev.inclusions || []), value],
    }));
    setComboInclusionInput("");
  };

  const handleSaveComboInclusion = (index) => {
    const value = cleanTextValue(editComboInclusionValue);
    if (!value) {
      notify("An inclusion needs a name.", "error");
      return;
    }

    const existing = formData.inclusions || [];
    const isDuplicate = existing.some(
      (entry, idx) => idx !== index && cleanTextValue(entry).toLowerCase() === value.toLowerCase()
    );
    if (isDuplicate) {
      notify(`"${value}" is already included.`, "info");
      return;
    }

    setFormData((prev) => {
      const items = [...(prev.inclusions || [])];
      items[index] = value;
      return { ...prev, inclusions: items };
    });
    setEditingComboInclusionIdx(null);
    setEditComboInclusionValue("");
  };

  const handleRemoveComboInclusion = (index) => {
    setFormData((prev) => ({
      ...prev,
      inclusions: (prev.inclusions || []).filter((_, i) => i !== index),
    }));
    setEditingComboInclusionIdx(null);
  };

  const handleSetDefaultScaffoldOption = (id) => {
    setFormData((prev) => ({ ...prev, default_scaffold_option_id: id }));
  };

  // Computed inclusion lists partitioned into Services (Setup + Staff), and Inventory classes
  const setupInclusions = (formData.inclusions || []).filter(isEventSetupInclusion);
  const staffInclusions = (formData.inclusions || []).filter(isStaffInclusion);
  const inventoryInclusions = (formData.inclusions || []).filter(isInventoryInclusion);
  const diningInclusions = inventoryInclusions;
  const servicesInclusionsCount = setupInclusions.length + staffInclusions.length;

  // Named apart from the state it reads so the inclusion section's three tabs
  // stay one concept. The section itself renders for regular packages only —
  // a combo's inclusions are plain lines with a section of their own.
  const inclusionTab = activeClassTab;

  // ============ HANDLERS - Form Submit ============
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Both types need a name. What they need beyond that
    // differs, because what they are priced on differs: an offer is sold at a
    // fixed rate per pax against its own guest count, a regular package at a
    // base setup price.
    if (!formData.name.trim()) {
      notify(isOffer ? "Combo name is required." : "Package name is required.", "error");
      return;
    }

    // A description is stored and shown on every customer-facing card, so it is
    // genuinely required. It used to be enforced only by the server, which
    // answered a blank one with a raw validation error.
    if (!formData.description.trim()) {
      notify(
        `Add a short description. Customers see it on the ${isOffer ? "offer" : "package"} card.`,
        "error",
      );
      return;
    }

    if (isOffer && !(Number(formData.price_per_guest) >= 0)) {
      notify(
        "Set the price per pax. A combo is priced from that rate times guest count.",
        "error",
      );
      return;
    }

    if (!isOffer) {
      const scaffolds = formData.scaffold_size_options || [];
      if (scaffolds.length === 0) {
        notify("Add at least one scaffold size with guest limits and base setup price.", "error");
        return;
      }
      const invalidScaffold = scaffolds.find(
        (opt) =>
          !opt.width_ft ||
          !opt.length_ft ||
          (!opt.free_setup &&
            (opt.price === undefined ||
              opt.price === "" ||
              Number(opt.price) < 0))
      );
      if (invalidScaffold) {
        notify("Every scaffold size needs valid dimensions and a base setup price.", "error");
        return;
      }
    }

    // A combo with no food is not a combo, and a nameless row would be saved
    // as nothing at all — both are caught here rather than at booking time.
    if (isOffer) {
      const items = formData.offer_food_items || [];
      if (items.length === 0) {
        notify(
          "Add at least one food item. A combo is the dishes it serves.",
          "error",
        );
        return;
      }
      if (items.some((item) => !String(item.item_name || "").trim())) {
        notify(
          'Every food item needs a name, e.g. "Chicken BBQ". Remove the blank rows or fill them in.',
          "error",
        );
        return;
      }
    }

    // Validate all inclusion quantities before submitting
    if (!isOffer) {
      // Validate inventory inclusions
      for (const inc of formData.inclusions || []) {
        if (!isInventoryInclusion(inc)) continue;
        const p = parseInclusion(inc);
        if (!p.name) continue;

        const rawQty = p.qty != null ? String(p.qty).trim() : "";
        const qtyNum = parseInt(rawQty, 10);

        if (!rawQty || isNaN(qtyNum) || qtyNum < 1) {
          notify(`Quantity must be at least 1 for "${p.name}".`, "error");
          setActiveClassTab("inventory");
          return;
        }

        const invItem = inventoryItems.find(
          (item) => item.item_name && item.item_name.trim().toLowerCase() === p.name.trim().toLowerCase()
        );
        if (invItem && invItem.quantity != null && qtyNum > invItem.quantity) {
          notify(
            `Quantity for "${invItem.item_name}" (${qtyNum}) exceeds total inventory. Maximum available quantity is ${invItem.quantity}.`,
            "error"
          );
          setActiveClassTab("inventory");
          return;
        }
      }

      // Validate staff inclusions
      for (const inc of formData.inclusions || []) {
        if (!isStaffInclusion(inc)) continue;
        const p = parseInclusion(inc);
        if (!p.name) continue;

        const rawQty = p.qty != null ? String(p.qty).trim() : "";
        const qtyNum = parseInt(rawQty, 10);

        if (!rawQty || isNaN(qtyNum) || qtyNum < 1) {
          notify(`Quantity must be at least 1 for "${p.name}".`, "error");
          setActiveClassTab("setup");
          return;
        }
      }
    }

    setLoading(true);
    try {
      const data = new FormData();
      const isFoodOnly = formData.package_type === "Food Only";
      let normalizedInclusions = (formData.inclusions || [])
        .map((inc) => {
          if (isOffer) {
            return cleanTextValue(String(inc).replace(/^\s*\[[^\]]*\]\s*/, ""));
          }
          const p = parseInclusion(inc);
          if (!p.name) return "";
          const q = p.qty ? ` (${p.qty})` : "";
          return `[${p.category}] ${p.name}${q}`;
        })
        .filter(Boolean)
        .filter((inc) => {
          if (!isOffer && !isFoodOnly) return true;
          // For Special Offers or Food Only, filter out setup equipment keywords
          const lower = String(inc).toLowerCase();
          return (
            !lower.includes("backdrop") &&
            !lower.includes("stage setup") &&
            !lower.includes("scaffold") &&
            !lower.includes("tent") &&
            !lower.includes("couch") &&
            !lower.includes("grass carpet") &&
            !lower.includes("chandelier") &&
            !lower.includes("dove") &&
            !lower.includes("red carpet") &&
            !lower.includes("monoblock chairs") &&
            !lower.includes("tiffany chairs") &&
            !lower.includes("round tables") &&
            !lower.includes("industrial fan") &&
            !lower.includes("[event setup & furniture]")
          );
        });

      // Deduplicate normalized inclusions
      const seenIncs = new Set();
      normalizedInclusions = normalizedInclusions.filter((inc) => {
        const key = inc.toLowerCase();
        if (seenIncs.has(key)) return false;
        seenIncs.add(key);
        return true;
      });

      const rawScaffolds = isOffer || isFoodOnly
        ? []
        : (formData.scaffold_size_options || []).map((option) => ({
            ...option,
            width_ft: Number(option.width_ft),
            length_ft: Number(option.length_ft),
            area_ft2: option.area_ft2 || Number(option.width_ft) * Number(option.length_ft),
            guest_min: option.guest_min !== undefined && option.guest_min !== "" ? Number(option.guest_min) : undefined,
            guest_max: option.guest_max !== undefined && option.guest_max !== "" ? Number(option.guest_max) : undefined,
            price: option.free_setup ? 0 : Number(option.price) || 0,
            free_setup: Boolean(option.free_setup),
          }));

      const defaultScaffold =
        rawScaffolds.find(
          (o) => String(o._id || o.id) === String(formData.default_scaffold_option_id)
        ) || rawScaffolds[0];

      const derivedSetupPrice = defaultScaffold ? defaultScaffold.price : 0;
      const allMins = rawScaffolds
        .map((s) => Number(s.guest_min))
        .filter((n) => Number.isFinite(n) && n > 0);
      const allMaxs = rawScaffolds
        .map((s) => Number(s.guest_max))
        .filter((n) => Number.isFinite(n) && n > 0);
      const derivedGuestMin = allMins.length > 0 ? Math.min(...allMins) : "";
      const derivedGuestMax = allMaxs.length > 0 ? Math.max(...allMaxs) : "";

      const normalizedFormData = {
        ...formData,
        event_type: "",
        // The event-space build, which only a regular package has.
        scaffold_size_options: rawScaffolds,
        default_scaffold_option_id: isOffer || isFoodOnly
          ? ""
          : formData.default_scaffold_option_id || (defaultScaffold?._id || ""),
        setup_equipment: isOffer || isFoodOnly ? [] : formData.setup_equipment || [],
        add_ons: isOffer || isFoodOnly
          ? []
          : (formData.add_ons || [])
              .map((addon) => ({
                name: cleanTextValue(addon.name),
                qty: String(addon.qty || "").trim(),
              }))
              .filter((addon) => addon.name),
        inclusions: normalizedInclusions,
        // Derived from scaffold size options for regular packages
        setup_price: isOffer ? "" : String(derivedSetupPrice),
        guest_min: isOffer ? formData.guest_min || "" : String(derivedGuestMin),
        guest_max: isOffer ? formData.guest_max || "" : String(derivedGuestMax),
        guest_count: isOffer ? formData.guest_count || "" : "",
        price_per_guest: isOffer ? formData.price_per_guest || "" : "",
        // Saved in the order shown; the server renumbers `sort_order` from it.
        offer_food_items: isOffer
          ? (formData.offer_food_items || [])
              .map((item) => ({
                menu_category: cleanTextValue(item.menu_category),
                item_name: cleanTextValue(item.item_name),
              }))
              .filter((item) => item.item_name)
              .filter(
                (item, idx, self) =>
                  idx ===
                  self.findIndex(
                    (t) =>
                      t.menu_category.toLowerCase() ===
                        item.menu_category.toLowerCase() &&
                      t.item_name.toLowerCase() ===
                        item.item_name.toLowerCase()
                  )
              )
          : [],
      };

      Object.keys(normalizedFormData).forEach((key) => {
        if (key === "inclusions" || key === "setup_equipment" || key === "add_ons") {
          data.append(key, JSON.stringify(normalizedFormData[key]));
        } else if (key === "scaffold_size_options" || key === "offer_food_items") {
          data.append(key, JSON.stringify(normalizedFormData[key]));
        } else {
          data.append(key, normalizedFormData[key]);
        }
      });

      // Files arrive already validated and downscaled from the image fields.
      if (imageFile) {
        data.append("image", imageFile);
      }

      galleryFiles.forEach((file) => {
        data.append("gallery", file);
      });

      galleryToRemove.forEach((url) => {
        data.append("gallery_to_remove[]", url);
      });

      const noun = isOffer ? "Combo" : "Package";
      if (pkg && pkg._id) {
        const res = await AdminAPI.updatePackage(pkg._id, data);
        notify(`${noun} updated successfully`, "success");

        // Clear newly staged files now that they are uploaded
        setImageFile(null);
        setGalleryFiles([]);
        setGalleryToRemove([]);

        const updatedDoc = res?.data;
        const normalizedSavedAddOns = (updatedDoc?.add_ons || normalizedFormData.add_ons || []).map((a) => ({
          name: cleanTextValue(a.name || (typeof a === "string" ? a : "")),
          qty: a.qty || "",
        }));

        const savedState = {
          ...normalizedFormData,
          name: updatedDoc?.name || normalizedFormData.name,
          description: updatedDoc?.description || normalizedFormData.description,
          fullDescription: updatedDoc?.fullDescription || normalizedFormData.fullDescription,
          add_ons: normalizedSavedAddOns,
          inclusions:
            updatedDoc?.offer_type === OFFER_TYPES.SPECIAL
              ? offerInclusions(updatedDoc)
              : normalizedInclusions,
          setup_equipment: updatedDoc?.setup_equipment || normalizedFormData.setup_equipment,
          scaffold_size_options: updatedDoc?.scaffold_size_options || normalizedFormData.scaffold_size_options,
          offer_food_items: isOffer
            ? offerFoodItems(updatedDoc || pkg).map((item) => ({
                menu_category: cleanTextValue(item.menu_category),
                item_name: cleanTextValue(item.item_name),
              }))
            : [],
        };

        setFormData(savedState);
        setBaseSnapshot(getPackageSnapshot(savedState, null, [], []));

        if (onSave) {
          onSave(true, updatedDoc);
        }
      } else {
        const res = await AdminAPI.createPackage(data);
        notify(`${noun} created successfully`, "success");
        if (onSave) {
          onSave(false, res?.data);
        }
      }
    } catch (error) {
      notify(
        error.response?.data?.message || "Failed to save package",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  // ============ RENDER ============
  return (
    <>
      <AIPackageParserModal
        isOpen={isParserOpen}
        onClose={() => setIsParserOpen(false)}
        offerType={formData.offer_type}
        onParsed={(data) => {
          setFormData((prev) => ({
            ...prev,
            ...data,
            // The extractor never changes what is being created — the tab
            // decided that, and a document that reads like a package must not
            // turn a combo into one.
            offer_type: prev.offer_type,
            // Keep existing arrays if they are empty in parsed data, otherwise overwrite
            inclusions: data.inclusions?.length ? data.inclusions : prev.inclusions,
            add_ons: data.add_ons?.length ? data.add_ons : prev.add_ons,
            offer_food_items: data.offer_food_items?.length
              ? data.offer_food_items
              : prev.offer_food_items,
            scaffold_size_options: data.scaffold_size_options?.length ? data.scaffold_size_options : prev.scaffold_size_options,
          }));
        }}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
        {/* ============ HEADER ============ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">
                {pkg
                  ? isOffer
                    ? "View Special Offer"
                    : "View Package"
                  : isOffer
                    ? "Add New Combo"
                    : "Add New Package"}
              </h2>
              <button
                type="button"
                onClick={() => setIsParserOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer"
              >
                <Sparkles size={12} />
                <span>Auto-Fill with AI</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

        {/* ============ SCROLLABLE CONTENT ============ */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8">
          {/* SECTION 1: Basic Information */}
          <section>
            <h3 className="font-bold text-foreground mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Package Type (Locked / Read-Only for existing packages) */}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    Package Type {!pkg && <span className="text-red-400">*</span>}
                  </label>
                  {pkg && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                      <Lock size={11} className="text-gray-400" />
                      Locked / Non-changeable
                    </span>
                  )}
                </div>

                {pkg ? (
                  <div
                    className={`rounded-xl border px-3.5 py-3 flex items-center justify-between transition-colors ${
                      isOffer
                        ? "border-amber-200/80 bg-amber-50/40"
                        : "border-primary/20 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isOffer
                            ? "bg-amber-100 text-amber-600"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {isOffer ? <Tag size={16} /> : <Package size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {isOffer ? "Special Offer" : "Regular Package"}
                          </span>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                              isOffer
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-primary/10 text-primary border border-primary/20"
                            }`}
                          >
                            Fixed Type
                          </span>
                        </div>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          {isOffer
                            ? "A fixed combo meal for a set guest count, priced per pax."
                            : "Priced by setup size. Guest count is an estimate."}
                        </span>
                      </div>
                    </div>
                    <div className="text-gray-400 pl-2">
                      <Lock size={14} />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        id: OFFER_TYPES.REGULAR,
                        title: "Regular Package",
                        blurb: "Priced by setup size. Guest count is an estimate.",
                      },
                      {
                        id: OFFER_TYPES.SPECIAL,
                        title: "Special Offer",
                        blurb: "A fixed combo meal for a set guest count, priced per pax.",
                      },
                    ].map((option) => {
                      const selected = formData.offer_type === option.id;
                      const offerOption = option.id === OFFER_TYPES.SPECIAL;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setFormData((prev) => {
                              const next = { ...prev, offer_type: option.id };
                              // A regular package supports one size. Switching
                              // down keeps the first and drops the rest, rather
                              // than storing a list the type cannot express.
                              if (option.id === OFFER_TYPES.REGULAR) {
                                next.scaffold_size_options = (
                                  prev.scaffold_size_options || []
                                )
                                  .slice(0, 1)
                                  // Free set-up is an offer promise; a regular
                                  // package makes none, so the flag goes with it.
                                  .map((option) => ({ ...option, free_setup: false }));
                                next.default_scaffold_option_id = "";
                              }
                              return next;
                            })
                          }
                          className={`rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                            selected
                              ? offerOption
                                ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400"
                                : "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            {offerOption && (
                              <Tag size={13} className="text-amber-500" />
                            )}
                            {option.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-gray-500">
                            {option.blurb}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Package Name */}
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">
                  {isOffer ? "Combo Name" : "Package Name"}{" "}
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  placeholder={
                    isOffer
                      ? "e.g. Classic Celebration Combo"
                      : "e.g. Elegant White Wedding Setup"
                  }
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>




              {/* Availability Toggle */}
              <div className="col-span-2 flex items-center justify-between bg-gray-50 border border-gray-100 p-4 rounded-xl">
                <div>
                  <p className="font-semibold text-foreground">
                    Availability Status
                  </p>
                  <p className="text-xs text-gray-500">
                    {isOffer
                      ? "Unavailable combos are hidden from customers and cannot be booked"
                      : "Toggle to make package visible to customers"}
                  </p>
                </div>
                <button
                  onClick={() =>
                    setFormData({ ...formData, available: !formData.available })
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${
                    formData.available ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full absolute transition-all ${
                      formData.available ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* SECTION 2: Description */}
          <section>
            <h3 className="font-bold text-foreground mb-4">Description</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Short Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-20"
                  placeholder={
                    isOffer
                      ? "Shown on the combo card, e.g. A balanced combo designed for small celebrations."
                      : "Brief summary of the setup package (1-2 sentences)"
                  }
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Full Description
                </label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary h-32"
                  placeholder={
                    isOffer
                      ? "Shown on the combo's detail page — what the meal is and who it suits"
                      : "Detailed description of what this setup package includes"
                  }
                  value={formData.fullDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fullDescription: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </section>

          {/* SECTION 3: Pricing & Guest Count — Special Offers only */}
          {isOffer && (
            <section>
              <h3 className="font-bold text-foreground mb-1">Pricing</h3>
              <p className="mb-4 text-xs text-gray-500">
                Special Offers are priced per pax. Customers will specify their guest count when booking.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm text-gray-600 mb-1">
                    Price Per Pax (₱) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-amber-300 bg-amber-50/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                    placeholder="e.g. 350"
                    value={formData.price_per_guest}
                    onChange={(e) => {
                      if (Number(e.target.value) < 0) return;
                      setFormData({
                        ...formData,
                        price_per_guest: e.target.value,
                      });
                    }}
                  />
                </div>

                {Number(formData.price_per_guest) > 0 && (
                  <p className="col-span-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
                    Pricing: <strong>₱{Number(formData.price_per_guest).toLocaleString("en-PH")} / pax</strong> · Customer will specify guest count during booking.
                  </p>
                )}

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Minimum Guests
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none border-amber-300 bg-amber-50/40 focus:border-amber-500"
                    placeholder="e.g. 50"
                    value={formData.guest_min}
                    onChange={(e) => {
                      if (Number(e.target.value) < 0) return;
                      setFormData({ ...formData, guest_min: e.target.value });
                    }}
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Minimum guest count required to book this combo.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Maximum Guests
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none border-amber-300 bg-amber-50/40 focus:border-amber-500"
                    placeholder="e.g. 80"
                    value={formData.guest_max}
                    onChange={(e) => {
                      if (Number(e.target.value) < 0) return;
                      setFormData({ ...formData, guest_max: e.target.value });
                    }}
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Absolute limit: customer cannot select or enter more guests than this.
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 4: Combo Food ------------------------------------------
              What the combo serves, written out. A combo is a decided meal, so
              this is a list rather than a set of rules: one row per dish, each
              naming the course it belongs to, in the order it is presented.

              Dish and course names are free text with suggestions drawn from
              the live menu — a combo may serve something the standing menu does
              not list, but the usual case is one keystroke and names that match
              the rest of the product. */}
          {/* SECTION 4: Combo Food — Grouped by Category --------------------- */}
          {isOffer && (
            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-foreground">
                    <Tag size={15} className="text-amber-500" />
                    Combo Food <span className="text-red-400">*</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Dishes grouped by category. Customers see items organized by course.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Btn
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAddingCategory(true)}
                  >
                    <FolderPlus size={14} /> Add Category
                  </Btn>
                </div>
              </div>

              <datalist id="combo-course-suggestions">
                {categorySuggestions.map((label) => (
                  <option key={label} value={label} />
                ))}
              </datalist>

              <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                {categoryGroups.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-amber-300 bg-white/80 p-6 text-center">
                    <p className="mb-3 text-sm italic text-gray-500">
                      No food categories yet. Choose a category below or add a custom one to start listing dishes.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {availableCategoriesToAdd.slice(0, 8).map((presetCat) => (
                        <button
                          key={presetCat}
                          type="button"
                          onClick={() => handleAddNewCategory(presetCat)}
                          className="flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 hover:border-amber-400 cursor-pointer"
                        >
                          <Plus size={12} /> {presetCat}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="flex items-center gap-1 rounded-lg border border-dashed border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 cursor-pointer"
                      >
                        <Plus size={12} /> Custom Category
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryGroups.map((group) => {
                      const isCollapsed = Boolean(collapsedCategories[group.name]);
                      const isEditingThisCat = editingCategory === group.name;

                      const catDishes = getDishesForCategory(menuItems, group.name);
                      const selectedDishNames = new Set(
                        group.items
                          .map((i) => (i.item_name || "").trim().toLowerCase())
                          .filter(Boolean)
                      );
                      const availableCategoryDishes = catDishes.filter(
                        (dish) =>
                          !selectedDishNames.has((dish.name || "").trim().toLowerCase())
                      );
                      const currentSearch = categoryInputs[group.name] || "";
                      const q = currentSearch.trim().toLowerCase();
                      const filteredAvailableDishes = q
                        ? availableCategoryDishes.filter(
                            (d) =>
                              (d.name || "").toLowerCase().includes(q) ||
                              (d.description || "").toLowerCase().includes(q)
                          )
                        : availableCategoryDishes;

                      return (
                        <div
                          key={group.name}
                          className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-2xs transition-all"
                        >
                          {/* Category Header */}
                          <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/80 px-4 py-2.5">
                            <div className="flex flex-1 items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={() => toggleCollapseCategory(group.name)}
                                className="rounded p-1 text-amber-800 transition-colors hover:bg-amber-100 hover:text-amber-950 cursor-pointer"
                                title={isCollapsed ? "Expand category" : "Collapse category"}
                              >
                                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                              </button>

                              {isEditingThisCat ? (
                                <div className="flex flex-1 items-center gap-1.5 max-w-xs">
                                  <input
                                    type="text"
                                    list="combo-course-suggestions"
                                    autoFocus
                                    className="w-full rounded border border-amber-400 bg-white px-2 py-1 text-xs font-bold text-amber-950 focus:outline-none"
                                    value={editCategoryNameValue}
                                    onChange={(e) => setEditCategoryNameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleRenameCategoryGroup(group.name, editCategoryNameValue);
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRenameCategoryGroup(group.name, editCategoryNameValue)}
                                    className="rounded p-1 text-amber-700 hover:bg-amber-100 cursor-pointer"
                                    title="Save name"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingCategory(null)}
                                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="truncate text-xs font-bold uppercase tracking-wider text-amber-950">
                                    {group.name}
                                  </span>
                                  <span className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-extrabold text-amber-900">
                                    {group.items.length} {group.items.length === 1 ? "item" : "items"}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 ml-2">
                              {!isEditingThisCat && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategory(group.name);
                                    setEditCategoryNameValue(group.name);
                                  }}
                                  className="rounded p-1 text-gray-400 transition-colors hover:bg-amber-100 hover:text-amber-700 cursor-pointer"
                                  title="Rename category"
                                >
                                  <Pencil size={13} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveCategoryGroup(group.name)}
                                className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                title="Delete category"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Category Items List & Food Selector */}
                          {!isCollapsed && (
                            <div className="space-y-3 bg-amber-50/20 p-3">
                              {/* 1. Configured dishes in this category */}
                              {group.items.length === 0 ? (
                                <p className="py-2.5 text-center text-xs italic text-gray-500 bg-amber-50/50 rounded-lg border border-dashed border-amber-200">
                                  No dishes added under {group.name} yet. Select from available dishes below or create a new one.
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {group.items.map((item, catIdx) => (
                                    <div
                                      key={item.globalIndex}
                                      className="flex items-center gap-2 rounded-lg border border-amber-200/80 bg-white px-2.5 py-1.5 shadow-2xs"
                                    >
                                      <div className="flex flex-col">
                                        <button
                                          type="button"
                                          onClick={() => handleMoveFoodItemWithinCategory(group.name, catIdx, -1)}
                                          disabled={catIdx === 0}
                                          aria-label={`Move ${item.item_name || "item"} up`}
                                          className="rounded px-0.5 text-gray-400 transition-colors hover:text-amber-600 disabled:opacity-20 cursor-pointer"
                                        >
                                          <ChevronUp size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveFoodItemWithinCategory(group.name, catIdx, 1)}
                                          disabled={catIdx === group.items.length - 1}
                                          aria-label={`Move ${item.item_name || "item"} down`}
                                          className="rounded px-0.5 text-gray-400 transition-colors hover:text-amber-600 disabled:opacity-20 cursor-pointer"
                                        >
                                          <ChevronDown size={13} />
                                        </button>
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <input
                                          type="text"
                                          className={`w-full rounded-md border px-3 py-1 text-sm bg-white focus:outline-none ${
                                            String(item.item_name || "").trim()
                                              ? "border-gray-200 focus:border-amber-500"
                                              : "border-red-300 focus:border-red-400"
                                          }`}
                                          placeholder={`e.g. Dish name under ${group.name}`}
                                          value={item.item_name || ""}
                                          onChange={(e) =>
                                            handleUpdateFoodItem(item.globalIndex, {
                                              item_name: e.target.value,
                                            })
                                          }
                                          onBlur={(e) => {
                                            const cleaned = cleanTextValue(e.target.value);
                                            if (cleaned !== e.target.value) {
                                              handleUpdateFoodItem(item.globalIndex, {
                                                item_name: cleaned,
                                              });
                                            }
                                          }}
                                        />
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() => handleRemoveFoodItem(item.globalIndex)}
                                        className="rounded p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                                        title="Remove dish"
                                        aria-label={`Remove ${item.item_name || "item"}`}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 2. Searchable Dish Browser & Inline Creator */}
                              <div className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-3 space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                                      Select Dishes ({availableCategoryDishes.length} available)
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenQuickCreateFood(currentSearch, group.name)
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 cursor-pointer shrink-0 transition-colors"
                                    title="Create a new food item in this category"
                                  >
                                    <Plus size={13} /> New Food
                                  </button>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                  <Search
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                                  />
                                  <input
                                    type="text"
                                    placeholder={`Search dishes under ${group.name}...`}
                                    value={currentSearch}
                                    onChange={(e) =>
                                      setCategoryInputs((prev) => ({
                                        ...prev,
                                        [group.name]: e.target.value,
                                      }))
                                    }
                                    className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-8 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                  />
                                  {currentSearch && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCategoryInputs((prev) => ({
                                          ...prev,
                                          [group.name]: "",
                                        }))
                                      }
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                                      title="Clear search"
                                    >
                                      <X size={12} />
                                    </button>
                                  )}
                                </div>

                                {/* Properly sized, clearly visible searchable list */}
                                <div className="max-h-48 overflow-y-auto rounded-lg border border-amber-200/80 bg-white shadow-2xs divide-y divide-gray-100">
                                  {filteredAvailableDishes.length > 0 ? (
                                    filteredAvailableDishes.map((dish) => (
                                      <div
                                        key={dish._id || dish.name}
                                        onClick={() =>
                                          handleAddDishToCategory(group.name, dish.name)
                                        }
                                        className="flex items-center justify-between px-3 py-2 hover:bg-amber-50/70 transition-colors group cursor-pointer"
                                        title={`Add "${dish.name}" to ${group.name}`}
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                          <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                                            <Utensils size={12} />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-800 group-hover:text-amber-950 truncate">
                                              {dish.name}
                                            </p>
                                            {dish.description && (
                                              <p className="text-[10px] text-gray-400 truncate max-w-sm">
                                                {dish.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddDishToCategory(group.name, dish.name);
                                          }}
                                          className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0 shadow-2xs cursor-pointer"
                                        >
                                          <Plus size={11} /> Add
                                        </button>
                                      </div>
                                    ))
                                  ) : availableCategoryDishes.length === 0 ? (
                                    catDishes.length > 0 ? (
                                      <div className="p-3 text-center text-xs font-medium text-emerald-700 bg-emerald-50/40">
                                        ✓ All {catDishes.length} dishes in {group.name} have been added to this combo.
                                      </div>
                                    ) : (
                                      <div className="p-4 text-center text-xs text-gray-500">
                                        <p className="mb-2">
                                          No dishes recorded under "{group.name}" yet.
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleOpenQuickCreateFood("", group.name)
                                          }
                                          className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 cursor-pointer"
                                        >
                                          <Plus size={12} /> Create first dish in {group.name}
                                        </button>
                                      </div>
                                    )
                                  ) : (
                                    <div className="p-4 text-center text-xs text-gray-500">
                                      <p className="mb-2">
                                        No dishes match "<strong className="text-gray-800">{currentSearch}</strong>".
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenQuickCreateFood(currentSearch, group.name)
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700 cursor-pointer"
                                      >
                                        <Plus size={12} /> Create "{currentSearch}" in {group.name}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bottom Add Category Bar */}
                <div className="pt-2 border-t border-amber-200/60">
                  {isAddingCategory ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/90 p-3 shadow-2xs">
                      <span className="text-xs font-bold uppercase text-amber-900">New Category:</span>
                      <input
                        type="text"
                        list="combo-course-suggestions"
                        autoFocus
                        placeholder="e.g. Viand, Fried, Pasta, Drinks, Dessert..."
                        className="flex-1 min-w-[160px] rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddNewCategory(newCategoryName);
                          }
                        }}
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAddNewCategory(newCategoryName)}
                          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-amber-700"
                        >
                          Add Group
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCategory(false);
                            setNewCategoryName("");
                          }}
                          className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-dashed border-amber-400 bg-amber-50/80 px-4 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100"
                      >
                        <FolderPlus size={15} /> + Add Category
                      </button>

                      {categoryGroups.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const allCollapsed = {};
                              categoryGroups.forEach((g) => (allCollapsed[g.name] = true));
                              setCollapsedCategories(allCollapsed);
                            }}
                            className="text-xs font-medium text-amber-700 hover:underline"
                          >
                            Collapse All
                          </button>
                          <span className="text-gray-300">·</span>
                          <button
                            type="button"
                            onClick={() => setCollapsedCategories({})}
                            className="text-xs font-medium text-amber-700 hover:underline"
                          >
                            Expand All
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* SECTION 5: Scaffold / Event Space — regular packages only -------
              A combo is food: it sells no event space, so it has no sizes to
              support and no size to mark as covering the set-up. ---------------
              A scaffold option is a supported event-space size and the guest
              capacity it fits. It carries no price: what a given size costs is
              a quotation decision, not a package one.

              A regular package supports one size — its own. A Special Offer may
              list several, and may mark one as covering the set-up (the client's
              "20x40 = FREE SET-UP"), which is why the flag lives on the size. */}
          {/* SECTION 5: Scaffold Size, Guest Capacity & Pricing — regular packages only */}
          {!isOffer && (
          <section>
            <div className="mb-4">
              <h3 className="font-bold text-foreground">Scaffold Size, Guest Capacity &amp; Pricing</h3>
              <p className="text-xs text-gray-500">
                Each scaffold size has its own guest limits and base setup price. Configure one or more sizes for this package.
              </p>
            </div>

            <div className="space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              {/* Saved sizes */}
              {scaffoldOptions.length > 0 && (
                <ul className="space-y-2.5">
                  {scaffoldOptions.map((opt, idx) => {
                    const editing = editingScaffoldIdx === idx;

                    if (editing) {
                      return (
                        <li
                          key={idx}
                          className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 shadow-2xs"
                        >
                          <div className="mb-2 flex items-center justify-between border-b border-blue-200/60 pb-1.5">
                            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                              Edit Scaffold #{idx + 1}
                            </span>
                            <span className="text-[11px] text-blue-700">
                              Update dimensions, capacity, or setup price
                            </span>
                          </div>
                          <ScaffoldFields
                            value={editScaffoldData}
                            onChange={setEditScaffoldData}
                            compact
                          />
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEditScaffold(idx)}
                              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary/90 cursor-pointer"
                            >
                              <Check size={13} /> Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditScaffold}
                              className="flex items-center gap-1 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 cursor-pointer"
                            >
                              <X size={13} /> Cancel
                            </button>
                          </div>
                        </li>
                      );
                    }

                    const isDefault =
                      String(formData.default_scaffold_option_id) === String(opt._id) ||
                      (!formData.default_scaffold_option_id && idx === 0);

                    return (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-xs transition-colors hover:border-gray-200"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {scaffoldOptions.length > 1 && (
                            <input
                              type="radio"
                              name="default_scaffold"
                              checked={isDefault}
                              onChange={() =>
                                handleSetDefaultScaffoldOption(opt._id || opt.id || idx)
                              }
                              className="shrink-0 accent-primary cursor-pointer"
                              title="Set as default scaffold size"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-bold text-slate-800">
                                {opt.label || `${opt.width_ft}ft × ${opt.length_ft}ft Setup`}
                              </span>
                              {scaffoldOptions.length > 1 && isDefault && (
                                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 text-xs text-gray-500">
                              <span className="font-medium text-slate-700">
                                📐 {opt.width_ft} × {opt.length_ft} ft ({opt.area_ft2 || opt.width_ft * opt.length_ft} ft²)
                              </span>
                              <span>·</span>
                              <span className="font-medium text-blue-700">
                                👥 {opt.guest_min || 0} – {opt.guest_max || "∞"} guests
                              </span>
                              <span>·</span>
                              <span className="font-bold text-emerald-700">
                                ₱{Number(opt.price || 0).toLocaleString("en-PH")} Base Setup
                              </span>
                              {opt.free_setup && (
                                <>
                                  <span>·</span>
                                  <span className="font-semibold text-emerald-600">
                                    FREE SET-UP
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditScaffold(idx, opt)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-primary/10 hover:text-primary cursor-pointer"
                            title="Edit scaffold configuration"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveScaffoldOption(idx)}
                            className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                            title="Remove scaffold configuration"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Add Scaffold Form */}
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 shadow-2xs">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {scaffoldOptions.length === 0 ? "Add Scaffold Configuration" : "Add Another Scaffold Option"}
                  </p>
                  <span className="text-[11px] text-gray-400">
                    Each scaffold controls guest limits &amp; base setup price
                  </span>
                </div>

                <ScaffoldFields
                  value={newScaffoldOption}
                  onChange={setNewScaffoldOption}
                />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                  <Btn
                    variant="primary"
                    size="sm"
                    onClick={handleAddScaffoldOption}
                    disabled={
                      !newScaffoldOption.width_ft ||
                      !newScaffoldOption.length_ft ||
                      newScaffoldOption.price === "" ||
                      newScaffoldOption.price === undefined
                    }
                  >
                    <Plus size={13} className="mr-1" /> Add Scaffold
                  </Btn>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                    <span className="text-[11px] text-gray-400 mr-1">
                      Standard presets:
                    </span>
                    {SCAFFOLD_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyScaffoldPreset(preset)}
                        className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-2xs transition-all hover:border-primary/40 hover:bg-powder hover:text-primary cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {scaffoldOptions.length === 0 && (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 p-3.5 text-center">
                  <p className="text-xs font-medium text-amber-800">
                    No scaffold size configured yet. Use the form above to add at least one scaffold option with size, guest limits, and base setup price.
                  </p>
                </div>
              )}
            </div>
          </section>
          )}


          {/* SECTION 5b: Combo Inclusions -----------------------------------
              What comes with the combo besides the food — buffet setup, serving
              utensils, plates. Plain lines the admin types, because a combo's
              inclusions are what the customer is told they get, not items drawn
              from the inventory the way a setup package's are. */}
          {isOffer && (
            <section>
              <div className="mb-4">
                <h3 className="font-bold text-foreground">Combo Inclusions</h3>
                <p className="text-xs text-gray-500">
                  What comes with the combo besides the dishes, e.g. buffet
                  setup, serving utensils, disposable plates.
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="e.g. Buffet Setup, Disposable Plates"
                    value={comboInclusionInput}
                    onChange={(e) => setComboInclusionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddComboInclusion();
                      }
                    }}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-foreground placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                  <Btn
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => handleAddComboInclusion()}
                    disabled={!comboInclusionInput.trim()}
                  >
                    <Plus size={12} /> Add
                  </Btn>
                </div>

                {(formData.inclusions || []).length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 bg-white/60 py-5 text-center text-sm italic text-gray-400">
                    No inclusions yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {(formData.inclusions || []).map((inc, index) => {
                      const editing = editingComboInclusionIdx === index;

                      if (editing) {
                        return (
                          <li
                            key={index}
                            className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-2"
                          >
                            <input
                              type="text"
                              value={editComboInclusionValue}
                              onChange={(e) => setEditComboInclusionValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleSaveComboInclusion(index);
                                } else if (e.key === "Escape") {
                                  setEditingComboInclusionIdx(null);
                                }
                              }}
                              autoFocus
                              className="flex-1 rounded border border-blue-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveComboInclusion(index)}
                              className="flex items-center gap-1 rounded bg-primary px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 shrink-0"
                            >
                              <Check size={12} /> Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingComboInclusionIdx(null)}
                              className="rounded px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 shrink-0"
                            >
                              Cancel
                            </button>
                          </li>
                        );
                      }

                      return (
                        <li
                          key={index}
                          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-2xs"
                        >
                          <Check size={13} className="shrink-0 text-emerald-500" />
                          <span className="flex-1 truncate text-foreground">
                            {inc}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingComboInclusionIdx(index);
                              setEditComboInclusionValue(inc);
                            }}
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary"
                            title="Edit inclusion"
                            aria-label={`Edit ${inc}`}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveComboInclusion(index)}
                            className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Remove inclusion"
                            aria-label={`Remove ${inc}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* SECTION 6: Inclusions & Add-ons — regular packages only.
              A combo's inclusions are plain lines with their own section above,
              and it has no add-ons: extras are sold alongside an event-space
              build, which a combo is not. */}
          {!isOffer && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-foreground">
                  {isOffer ? "Add-ons" : "Inclusions & Add-ons"}
                </h3>
                <p className="text-xs text-gray-500">
                  {isOffer
                    ? "Optional extras a customer can add to this combo. Priced on the quotation."
                    : "Configure the 3 package classes shown to customers on the website & inquiries."}
                </p>
              </div>
            </div>

            {/* 3-Class Segmented Tabs. A combo has no inventory classes to
                switch between, so it shows no tab bar at all. */}
            {!isOffer && (
            <div className="flex bg-gray-100 p-1 rounded-xl w-full border border-gray-200/80 text-xs font-semibold mb-4 gap-1">
              <button
                type="button"
                onClick={() => setActiveClassTab("setup")}
                className={`flex-1 py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeClassTab === "setup" || activeClassTab === "services"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>🛎️</span>
                <span className="truncate">Services</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shrink-0">
                  {servicesInclusionsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveClassTab("inventory")}
                className={`flex-1 py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeClassTab === "inventory" || activeClassTab === "dining"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>📦</span>
                <span className="truncate">Inventory</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shrink-0">
                  {inventoryInclusions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveClassTab("addons")}
                className={`flex-1 py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeClassTab === "addons"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>✨</span>
                <span className="truncate">Add Ons</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shrink-0">
                  {(formData.add_ons || []).length}
                </span>
              </button>
            </div>
            )}

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
              {/* TAB 1: Services (Event Setup + Staff & Personnel) */}
              {(inclusionTab === "setup" || inclusionTab === "services") && (
                <div className="space-y-6">
                  {/* SUBSECTION 1: Event Setup Inclusions */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🎪</span>
                      <label className="font-semibold text-gray-800 text-sm">
                        Event Setup Inclusions
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Stage, backdrops, decorations & venue setup items shown to customers.
                    </p>

                    {/* Add Setup Item Form (Display-only, manual text input) */}
                    <div className="flex gap-2 mb-2 items-center w-full">
                      <input
                        type="text"
                        placeholder="Enter setup item name (e.g. Stage Setup, Venue Decoration, Backdrop Setup)"
                        value={setupInput.name}
                        onChange={(e) =>
                          setSetupInput((prev) => ({ ...prev, name: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSetupInclusion();
                          }
                        }}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                      />
                      <Btn
                        variant="primary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleAddSetupInclusion()}
                        disabled={!setupInput.name.trim()}
                      >
                        <Plus size={14} className="mr-1" /> Add
                      </Btn>
                    </div>

                    {/* Added Items */}
                    <div className="pt-2 border-t border-gray-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => toggleItemsList("setup")}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors select-none group"
                        >
                          <span>Added Items</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                            {setupInclusions.length}
                          </span>
                          {showItemsList.setup ? (
                            <ChevronUp size={13} className="text-gray-400 group-hover:text-gray-600" />
                          ) : (
                            <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                          )}
                        </button>
                        {setupInclusions.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleItemsList("setup")}
                            className="text-[11px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                          >
                            {showItemsList.setup ? "Minimize" : "Maximize"}
                          </button>
                        )}
                      </div>

                      {showItemsList.setup && (
                        setupInclusions.length > 0 ? (
                          <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {setupInclusions.map((inc, i) => {
                              const parsed = parseInclusion(inc);
                              return (
                                <li
                                  key={i}
                                  className="flex justify-between items-center text-sm bg-white px-3 py-2.5 rounded-lg border border-gray-100 shadow-2xs gap-3 hover:border-gray-200 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                                    <span className="font-semibold text-gray-900 break-words leading-tight">
                                      {parsed.name}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveInclusionString(inc)}
                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                                    title="Remove from package"
                                    aria-label={`Remove ${parsed.name}`}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-400 italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-gray-200">
                            No event setup items added yet
                          </p>
                        )
                      )}
                    </div>
                  </div>

                  {/* SUBSECTION 2: Staff & Personnel */}
                  <div className="pt-5 border-t border-gray-200/90">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">👥</span>
                      <label className="font-semibold text-gray-800 text-sm">
                        Staff & Personnel
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Event coordinators, waiters, servers, ushers & service staff included in this package.
                    </p>

                    {/* Add Staff Form (Name + Quantity + Add button) */}
                    <div className="flex gap-2 mb-2 items-center w-full">
                      <input
                        type="text"
                        placeholder="Enter staff role / title (e.g. Event Coordinator, Waiter, Server, Usher)"
                        value={staffInput.name}
                        onChange={(e) =>
                          setStaffInput((prev) => ({ ...prev, name: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddStaffInclusion();
                          }
                        }}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={staffInput.qty}
                        onChange={(e) =>
                          setStaffInput((prev) => ({ ...prev, qty: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddStaffInclusion();
                          }
                        }}
                        title="Quantity of staff / personnel"
                        className="w-24 shrink-0 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                      />
                      <Btn
                        variant="primary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleAddStaffInclusion()}
                        disabled={!staffInput.name.trim()}
                      >
                        <Plus size={14} className="mr-1" /> Add
                      </Btn>
                    </div>

                    {/* Added Staff List */}
                    <div className="pt-2 border-t border-gray-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          type="button"
                          onClick={() => toggleItemsList("staff")}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors select-none group"
                        >
                          <span>Added Staff</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 font-bold">
                            {staffInclusions.length}
                          </span>
                          {showItemsList.staff ? (
                            <ChevronUp size={13} className="text-gray-400 group-hover:text-gray-600" />
                          ) : (
                            <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                          )}
                        </button>
                        {staffInclusions.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleItemsList("staff")}
                            className="text-[11px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                          >
                            {showItemsList.staff ? "Minimize" : "Maximize"}
                          </button>
                        )}
                      </div>

                      {showItemsList.staff && (
                        staffInclusions.length > 0 ? (
                          <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                            {staffInclusions.map((inc, i) => {
                              const parsed = parseInclusion(inc);
                              const qty = parsed.qty || "1";
                              return (
                                <li
                                  key={i}
                                  className="flex justify-between items-center text-sm bg-white px-3 py-2.5 rounded-lg border border-gray-100 shadow-2xs gap-3 hover:border-gray-200 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-2 h-2 bg-violet-500 rounded-full shrink-0" />
                                    <span className="font-semibold text-gray-900 break-words leading-tight">
                                      {parsed.name}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {/* Quantity Stepper */}
                                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                      <button
                                        type="button"
                                        onClick={() => handleStepStaffQty(inc, -1)}
                                        className="px-2 py-1 text-gray-600 hover:bg-gray-200 transition-colors text-xs font-bold"
                                        title="Decrease quantity"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="1"
                                        value={qty}
                                        onChange={(e) => handleUpdateStaffQty(inc, e.target.value)}
                                        className="w-12 text-center text-xs font-bold bg-white py-1 focus:outline-none border-x border-gray-200"
                                        title="Edit staff quantity"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleStepStaffQty(inc, 1)}
                                        className="px-2 py-1 text-gray-600 hover:bg-gray-200 transition-colors text-xs font-bold"
                                        title="Increase quantity"
                                      >
                                        +
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveInclusionString(inc)}
                                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                      title="Remove from package"
                                      aria-label={`Remove ${parsed.name}`}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-400 italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-gray-200">
                            No staff & personnel added yet
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Inventory */}
              {(inclusionTab === "inventory" || inclusionTab === "dining") && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">📦</span>
                      <label className="font-semibold text-gray-800 text-sm">
                        Inventory Inclusions
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Food warmers, tableware, furniture, equipment & supplies tracked in inventory.
                    </p>

                    {/* Add Inventory Item Form */}
                    <div className="flex gap-2 mb-2 items-center w-full">
                      <AutocompleteInput
                        placeholder="Search item name (e.g. Food Warmer, Round Tables, Plates)"
                        value={inventoryInput.name}
                        onChange={(val) =>
                          setInventoryInput((prev) => ({ ...prev, name: val }))
                        }
                        candidates={allInventoryItemNames}
                        sourceLabel="Inventory"
                        onSubmit={() => handleAddInventoryInclusion()}
                        onCreateNew={(name) =>
                          handleOpenQuickCreate(name, "Dining & Service Inventory", false)
                        }
                        createActionLabel="+ Create New Inventory Item"
                      />
                      <input
                        type="number"
                        min="1"
                        max={selectedInvItem?.quantity != null ? selectedInvItem.quantity : undefined}
                        placeholder={
                          selectedInvItem?.quantity != null
                            ? `1–${selectedInvItem.quantity}`
                            : "Pkg Qty"
                        }
                        title={
                          selectedInvItem?.quantity != null
                            ? `Quantity Included in This Package (Total Quantity: ${selectedInvItem.quantity})`
                            : "Quantity Included in This Package"
                        }
                        className={`w-28 shrink-0 border rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none transition-colors ${
                          selectedInvItem?.quantity != null &&
                          Number(inventoryInput.qty) > selectedInvItem.quantity
                            ? "border-red-400 focus:border-red-500 bg-red-50/40 text-red-700"
                            : "border-gray-200 focus:border-primary"
                        }`}
                        value={inventoryInput.qty}
                        onChange={(e) =>
                          setInventoryInput({ ...inventoryInput, qty: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddInventoryInclusion();
                          }
                        }}
                      />
                      <Btn
                        variant="primary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleAddInventoryInclusion()}
                        disabled={
                          !inventoryInput.name.trim() ||
                          (selectedInvItem?.quantity != null &&
                            Number(inventoryInput.qty) > selectedInvItem.quantity)
                        }
                      >
                        <Plus size={14} className="mr-1" /> Add
                      </Btn>
                    </div>

                    {selectedInvItem && (
                      <div className="text-xs bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2.5 mb-2.5 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-medium">Inventory Item:</span>
                          <span className="font-bold text-gray-900">{selectedInvItem.item_name}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-500 font-medium">Total Quantity:</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            {selectedInvItem.quantity}
                          </span>
                        </div>
                        <span className="text-[11px] text-emerald-700/80 font-medium">
                          Package quantity assigned below will not modify inventory Total Quantity.
                        </span>
                      </div>
                    )}

                    {/* Quick Presets Chips */}
                    <div className="mb-1">
                      <button
                        type="button"
                        onClick={() => togglePresets("inventory")}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-800 transition-colors mb-2 select-none group"
                      >
                        <span>Quick Add Presets from Inventory</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 font-normal group-hover:bg-gray-200">
                          {allInventoryItemNames.length}
                        </span>
                        {showPresets.inventory ? (
                          <ChevronUp size={13} className="text-gray-400 group-hover:text-gray-600" />
                        ) : (
                          <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                        )}
                      </button>
                      {showPresets.inventory && (
                        allInventoryItemNames.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-1">
                            No items found in Inventory.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {allInventoryItemNames.map((preset, idx) => {
                              const isAdded = inventoryInclusions.some(
                                (inc) => parseInclusion(inc).name.toLowerCase() === preset.toLowerCase()
                              );
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleAddInventoryInclusion(preset)}
                                  className={`text-xs px-2.5 py-1 rounded-md border transition-all shadow-2xs flex items-center gap-1 ${
                                    isAdded
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-medium"
                                      : "bg-white border-gray-200 text-gray-600 hover:text-primary hover:border-primary hover:bg-primary/5"
                                  }`}
                                >
                                  {isAdded ? <Check size={10} className="text-emerald-600" /> : <Plus size={10} />}
                                  {preset}
                                </button>
                              );
                            })}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Active List */}
                  <div className="pt-2 border-t border-gray-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => toggleItemsList("inventory")}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors select-none group"
                      >
                        <span>Added Items</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          {inventoryInclusions.length}
                        </span>
                        {showItemsList.inventory ? (
                          <ChevronUp size={13} className="text-gray-400 group-hover:text-gray-600" />
                        ) : (
                          <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                        )}
                      </button>
                      {inventoryInclusions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleItemsList("inventory")}
                          className="text-[11px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                        >
                          {showItemsList.inventory ? "Minimize" : "Maximize"}
                        </button>
                      )}
                    </div>

                    {showItemsList.inventory && (
                      inventoryInclusions.length > 0 ? (
                        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {inventoryInclusions.map((inc, i) => {
                            const parsed = parseInclusion(inc);
                            const invItem = inventoryItems.find(
                              (item) =>
                                item.item_name &&
                                item.item_name.trim().toLowerCase() === parsed.name.toLowerCase()
                            );
                            const totalInvQty =
                              invItem?.quantity != null ? invItem.quantity : null;
                            const rawQtyStr = parsed.qty != null ? String(parsed.qty).trim() : "";
                            const qtyNum = parseInt(rawQtyStr, 10);
                            const isQtyValid = !isNaN(qtyNum) && qtyNum >= 1;

                            return (
                              <li
                                key={i}
                                className="flex flex-wrap sm:flex-nowrap justify-between items-center text-sm bg-white px-3 py-2.5 rounded-lg border border-gray-100 shadow-2xs gap-3 hover:border-gray-200 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0" />
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-gray-900 break-words leading-tight">
                                      {parsed.name}
                                    </span>
                                    {totalInvQty != null && (
                                      <span className="text-[11px] text-gray-500">
                                        Total Quantity:{" "}
                                        <strong className="text-gray-700 font-semibold">
                                          {totalInvQty}
                                        </strong>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 ml-auto">
                                  <div className="flex items-center gap-1.5 bg-gray-50/80 px-2 py-1 rounded-lg border border-gray-200">
                                    <span className="text-[11px] text-gray-500 font-medium hidden md:inline">
                                      Quantity Included in This Package:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleStepInclusionQty(inc, -1)}
                                      disabled={!isQtyValid || qtyNum <= 1}
                                      className="w-6 h-6 rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 border border-gray-200 flex items-center justify-center font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                                      title="Decrease package quantity"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      max={totalInvQty != null ? totalInvQty : undefined}
                                      value={rawQtyStr}
                                      onChange={(e) =>
                                        handleUpdateInclusionQty(inc, e.target.value)
                                      }
                                      placeholder="Qty"
                                      className={`w-14 text-center py-0.5 text-xs font-bold border rounded bg-white transition-colors focus:outline-none focus:border-primary ${
                                        !isQtyValid
                                          ? "border-red-400 focus:border-red-500 bg-red-50/40 text-red-700"
                                          : "border-gray-200 text-gray-900"
                                      }`}
                                      title={isQtyValid ? "Quantity Included in This Package" : "Quantity must be at least 1."}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleStepInclusionQty(inc, 1)}
                                      disabled={
                                        totalInvQty != null && isQtyValid && qtyNum >= totalInvQty
                                      }
                                      className="w-6 h-6 rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 border border-gray-200 flex items-center justify-center font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                                      title="Increase package quantity"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveInclusionString(inc)}
                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                    title="Remove from package"
                                    aria-label={`Remove ${parsed.name}`}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400 italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-gray-200">
                          No inventory items added yet
                        </p>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Add Ons */}
              {inclusionTab === "addons" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">✨</span>
                      <label className="font-semibold text-gray-800 text-sm">
                        Add Ons
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Extra options and entertainment packages customers can select during booking.
                    </p>

                    {/* Add Add-on Form */}
                    <div className="flex gap-2 mb-3 items-center w-full">
                      <AutocompleteInput
                        placeholder="Search addon (e.g. Dessert station, Fruit platter)"
                        value={addOnInput.name}
                        onChange={(val) =>
                          setAddOnInput((prev) => ({ ...prev, name: val }))
                        }
                        candidates={addonNames}
                        sourceLabel="Addons"
                        onSubmit={() => handleAddAddOn()}
                        onCreateNew={(name) =>
                          handleOpenQuickCreate(name, "Event Setup & Furniture", true)
                        }
                        createActionLabel="+ Create New Add-on"
                      />

                      <input
                        type="number"
                        min="1"
                        placeholder="Pkg Qty"
                        className="w-24 shrink-0 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={addOnInput.qty}
                        onChange={(e) =>
                          setAddOnInput({ ...addOnInput, qty: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddAddOn();
                          }
                        }}
                      />

                      <Btn
                        variant="primary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleAddAddOn()}
                        disabled={!addOnInput.name.trim()}
                      >
                        <Plus size={14} className="mr-1" /> Add
                      </Btn>
                    </div>

                    {/* Quick Presets Chips */}
                    <div className="mb-1">
                      <button
                        type="button"
                        onClick={() => togglePresets("addons")}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-800 transition-colors mb-2 select-none group"
                      >
                        <span>Quick Add Presets from Addons</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 font-normal group-hover:bg-gray-200">
                          {addonNames.length}
                        </span>
                        {showPresets.addons ? (
                          <ChevronUp size={13} className="text-gray-400 group-hover:text-gray-600" />
                        ) : (
                          <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                        )}
                      </button>
                      {showPresets.addons && (
                        addonNames.length === 0 ? (
                          <p className="text-xs text-gray-400 italic py-1">
                            No addons found in database.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                            {addonNames.map((preset, idx) => {
                              const isAdded = (formData.add_ons || []).some(
                                (addon) => cleanTextValue(addon.name).toLowerCase() === preset.toLowerCase()
                              );
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleAddAddOn(preset)}
                                  className={`text-xs px-2.5 py-1 rounded-md border transition-all shadow-2xs flex items-center gap-1 ${
                                    isAdded
                                      ? "bg-purple-50 border-purple-200 text-purple-700 font-medium"
                                      : "bg-white border-gray-200 text-gray-600 hover:text-primary hover:border-primary hover:bg-primary/5"
                                  }`}
                                >
                                  {isAdded ? <Check size={10} className="text-purple-600" /> : <Plus size={10} />}
                                  {preset}
                                </button>
                              );
                            })}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Active List */}
                  <div className="pt-2 border-t border-gray-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() => toggleItemsList("addons")}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors select-none group"
                      >
                        <span>Added Items</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold">
                          {(formData.add_ons || []).length}
                        </span>
                        {showItemsList.addons ? (
                          <ChevronUp size={13} className="text-gray-400 group-hover:text-gray-600" />
                        ) : (
                          <ChevronDown size={13} className="text-gray-400 group-hover:text-gray-600" />
                        )}
                      </button>
                      {(formData.add_ons || []).length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleItemsList("addons")}
                          className="text-[11px] text-gray-400 hover:text-gray-600 font-medium transition-colors"
                        >
                          {showItemsList.addons ? "Minimize" : "Maximize"}
                        </button>
                      )}
                    </div>

                    {showItemsList.addons && (
                      (formData.add_ons || []).length > 0 ? (
                        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {formData.add_ons.map((add, i) => {
                            const currentPkgQty = parseInt(add.qty, 10) || 1;

                            return (
                              <li
                                key={i}
                                className="flex flex-wrap sm:flex-nowrap justify-between items-center text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-2xs gap-3 hover:border-gray-200 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-2 h-2 bg-purple-500 rounded-full shrink-0" />
                                  <span className="font-semibold text-gray-900 break-words leading-tight">
                                    {add.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 ml-auto">
                                  <div className="flex items-center gap-1.5 bg-gray-50/80 px-2 py-1 rounded-lg border border-gray-200">
                                    <span className="text-[11px] text-gray-500 font-medium hidden md:inline">
                                      Quantity Included in This Package:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleStepAddOnQty(i, -1)}
                                      disabled={currentPkgQty <= 1}
                                      className="w-6 h-6 rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 border border-gray-200 flex items-center justify-center font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                                      title="Decrease quantity"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={currentPkgQty}
                                      onChange={(e) => handleUpdateAddOnQty(i, e.target.value)}
                                      className="w-12 text-center py-0.5 text-xs font-bold border border-gray-200 rounded bg-white text-gray-900 focus:outline-none focus:border-primary"
                                      title="Quantity Included in This Package"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleStepAddOnQty(i, 1)}
                                      className="w-6 h-6 rounded bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 flex items-center justify-center font-bold text-xs transition-colors shadow-2xs cursor-pointer"
                                      title="Increase quantity"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveAddOn(i)}
                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                    title="Remove add-on"
                                    aria-label={`Remove ${add.name}`}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400 italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-gray-200">
                          No add-ons configured yet
                        </p>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
          )}

          {/* SECTION 7: Media */}
          <section>
            <h3 className="font-bold text-foreground mb-4">Media</h3>
            <div className="space-y-6">
              {/* Cover image — 16:9 is how package cards and detail pages crop it */}
              <SingleImageField
                label="Cover image"
                hint="Landscape works best · JPG, PNG, GIF or WEBP · up to 5MB"
                aspect="16 / 9"
                previewWidth="13rem"
                emptyLabel="Add a cover image"
                existingUrl={pkg?.image_url}
                file={imageFile}
                onFileChange={setImageFile}
                disabled={loading}
              />

              <MultiImageField
                label="Gallery photos"
                existing={pkg?.gallery || []}
                removedExisting={galleryToRemove}
                onToggleExisting={(url) =>
                  setGalleryToRemove((prev) =>
                    prev.includes(url)
                      ? prev.filter((u) => u !== url)
                      : [...prev, url],
                  )
                }
                files={galleryFiles}
                onFilesChange={setGalleryFiles}
                maxNew={10}
                disabled={loading}
              />
            </div>
          </section>
        </div>

        {/* ============ FOOTER ============ */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
          <Btn variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={pkg && !isDirty ? onClose : handleSubmit}
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : !pkg
                ? isOffer
                  ? "Create Combo"
                  : "Create Package"
                : isDirty
                  ? "Update Changes"
                  : "Done"}
          </Btn>
        </div>
      </div>
    </div>

    <QuickInventoryCreateDrawer
      isOpen={quickDrawer.isOpen}
      initialName={quickDrawer.initialName}
      defaultCategory={quickDrawer.category}
      isAddon={quickDrawer.isAddon}
      existingItems={inventoryItems}
      existingAddons={addonItems}
      onClose={() => setQuickDrawer((prev) => ({ ...prev, isOpen: false }))}
      onCreateSuccess={handleQuickCreateSuccess}
    />

    {quickFoodModal.isOpen && (
      <QuickFoodCreateModal
        isOpen={quickFoodModal.isOpen}
        initialName={quickFoodModal.initialName}
        initialCategory={quickFoodModal.category}
        existingDishes={getDishesForCategory(menuItems, quickFoodModal.category)}
        onClose={() =>
          setQuickFoodModal({ isOpen: false, initialName: "", category: "" })
        }
        onCreateSuccess={handleQuickCreateFoodSuccess}
      />
    )}
    </>
  );
}
