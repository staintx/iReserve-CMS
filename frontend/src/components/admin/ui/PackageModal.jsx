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
} from "lucide-react";
import Btn from "./Btn";
import SingleImageField from "./SingleImageField";
import MultiImageField from "./MultiImageField";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import AIPackageParserModal from "./AIPackageParserModal";
import { OFFER_TYPES, offerFoodItems, offerInclusions } from "../../../lib/specialOffers";
import { resolveGroup, CATEGORY_GROUPS } from "../../../lib/menuCategories";

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
  const input = compact
    ? "w-20 rounded border border-blue-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
    : "w-24 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none";
  const label = compact
    ? "text-xs font-bold text-gray-700"
    : "text-sm font-bold text-gray-700";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={label}>Size</span>
        <input
          type="number"
          min="1"
          placeholder="Width"
          className={input}
          value={value.width_ft}
          onChange={(e) => set({ width_ft: e.target.value })}
        />
        <span className="text-sm text-gray-400">×</span>
        <input
          type="number"
          min="1"
          placeholder="Length"
          className={input}
          value={value.length_ft}
          onChange={(e) => set({ length_ft: e.target.value })}
        />
        <span className="text-xs text-gray-400">ft</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={label}>Fits</span>
        <input
          type="number"
          min="0"
          placeholder="Min guests"
          className={input}
          value={value.guest_min}
          onChange={(e) => set({ guest_min: e.target.value })}
        />
        <span className="text-sm text-gray-400">to</span>
        <input
          type="number"
          min="0"
          placeholder="Max guests"
          className={input}
          value={value.guest_max}
          onChange={(e) => set({ guest_max: e.target.value })}
        />
        <span className="text-xs text-gray-400">guests</span>
      </div>

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

  // ============ LOCAL INPUT STATES ============
  const [activeClassTab, setActiveClassTab] = useState("setup"); // 'setup' | 'dining' | 'addons'

  const [setupInput, setSetupInput] = useState({ name: "", qty: "" });
  const [diningInput, setDiningInput] = useState({ name: "", qty: "" });
  const [addOnInput, setAddOnInput] = useState({
    name: "",
    qty: "",
  });

  // Combo inclusions are plain lines ("Buffet setup"), typed one at a time.
  const [comboInclusionInput, setComboInclusionInput] = useState("");
  const [editingComboInclusionIdx, setEditingComboInclusionIdx] = useState(null);
  const [editComboInclusionValue, setEditComboInclusionValue] = useState("");

  // In-line editing states
  const [editingInclusionStr, setEditingInclusionStr] = useState(null);
  const [editInclusionData, setEditInclusionData] = useState({ name: "", qty: "" });

  const [editingAddOnIdx, setEditingAddOnIdx] = useState(null);
  const [editAddOnData, setEditAddOnData] = useState({
    name: "",
    qty: "",
  });

  const [newScaffoldOption, setNewScaffoldOption] = useState({
    label: "",
    width_ft: "",
    length_ft: "",
    guest_min: "",
    guest_max: "",
    // Whether the offer covers the set-up at this size. "20x40 = FREE SET-UP"
    // is expressed here, as data on the size, rather than as a rule in code.
    // There is no price: what a size costs is settled on the quotation.
    free_setup: false,
  });

  // ============ MEDIA STATE ============
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  // Saved gallery URLs the admin marked for deletion — only sent on submit.
  const [galleryToRemove, setGalleryToRemove] = useState([]);

  // ============ EFFECTS ============
  useEffect(() => {
    setGalleryToRemove([]);

    if (pkg) {
      // Normalize add_ons
      const normalizedAddOns = (pkg.add_ons || []).map((a) => ({
        name: a.name || (typeof a === "string" ? a : ""),
        qty: a.qty || "",
      }));

      setFormData({
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
          menu_category: item.menu_category,
          item_name: item.item_name,
        })),
        description: pkg.description || "",
        fullDescription: pkg.fullDescription || "",
        // A combo's inclusions are plain lines; anything saved with an old
        // inventory-class prefix reads back without it.
        inclusions:
          pkg.offer_type === OFFER_TYPES.SPECIAL
            ? offerInclusions(pkg)
            : pkg.inclusions || [],
        add_ons: normalizedAddOns,
        setup_equipment: pkg.setup_equipment || [],
        scaffold_size_options: pkg.scaffold_size_options || [],
        default_scaffold_option_id: pkg.default_scaffold_option_id || "",
      });
    } else {
      // A brand new record starts as whichever tab it was created from.
      setFormData((prev) => ({ ...prev, offer_type: defaultOfferType }));
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

  // What the combo's food costs, from the two numbers the admin just typed.
  // The same arithmetic the customer, the booking and the quotation all use.
  const comboTotal =
    Math.max(0, Math.floor(Number(formData.guest_count) || 0)) *
    Math.max(0, Number(formData.price_per_guest) || 0);

  const scaffoldOptions = formData.scaffold_size_options || [];
  const foodItems = useMemo(
    () => formData.offer_food_items || [],
    [formData.offer_food_items],
  );

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

  // A package is built for one event-space size, so once it has one the add
  // form gives way to "Replace". (Combos never reach this section — they sell
  // no event space — so there is no second case to keep open for.)
  const canAddScaffold = scaffoldOptions.length === 0;

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
  const parseInclusion = (str) => {
    const raw = String(str || "").trim();
    const match = raw.match(/^\s*\[([^\]]+)\]\s*(.+?)\s*(?:\(([^()]*)\))?\s*$/);
    if (!match) {
      return { category: "Event Setup & Furniture", name: raw, qty: "" };
    }
    return {
      category: match[1].trim(),
      name: match[2].trim(),
      qty: match[3]?.trim() || "",
    };
  };

  const isDiningInclusion = (incStr) => {
    const parsed = parseInclusion(incStr);
    const cat = String(parsed.category || "").toLowerCase();
    const name = String(parsed.name || "").toLowerCase();
    if (cat.includes("dining") || cat.includes("tableware") || cat.includes("service")) {
      return true;
    }
    const diningKeywords = [
      "warmer", "plate", "spoon", "glass", "tissue", "planggana",
      "dishwashing", "styrofoam", "cooler", "cubes", "gallon",
      "jug", "crew", "staff", "tulyasi", "tungko", "cutlery", "goblet",
    ];
    return diningKeywords.some((k) => name.includes(k));
  };

  const handleAddSetupInclusion = (customName) => {
    const nameToAdd = customName || setupInput.name;
    if (!nameToAdd.trim()) return;
    const qtyStr = setupInput.qty.trim() ? ` (${setupInput.qty.trim()})` : "";
    const incStr = `[Event Setup & Furniture] ${nameToAdd.trim()}${qtyStr}`;

    setFormData((prev) => ({
      ...prev,
      inclusions: [...prev.inclusions, incStr],
    }));

    setSetupInput({ name: "", qty: "" });
  };

  const handleAddDiningInclusion = (customName) => {
    const nameToAdd = customName || diningInput.name;
    if (!nameToAdd.trim()) return;
    const qtyStr = diningInput.qty.trim() ? ` (${diningInput.qty.trim()})` : "";
    const incStr = `[Dining & Service Inventory] ${nameToAdd.trim()}${qtyStr}`;

    setFormData((prev) => ({
      ...prev,
      inclusions: [...prev.inclusions, incStr],
    }));

    setDiningInput({ name: "", qty: "" });
  };

  const handleRemoveInclusionString = (targetStr) => {
    setFormData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.filter((inc) => inc !== targetStr),
    }));
  };

  const handleStartEditInclusion = (incStr) => {
    const parsed = parseInclusion(incStr);
    setEditingInclusionStr(incStr);
    setEditInclusionData({
      name: parsed.name,
      qty: parsed.qty || "",
    });
  };

  const handleSaveEditInclusion = (category, originalStr) => {
    if (!editInclusionData.name.trim()) return;
    const qtyStr = editInclusionData.qty.trim()
      ? ` (${editInclusionData.qty.trim()})`
      : "";
    const newIncStr = `[${category}] ${editInclusionData.name.trim()}${qtyStr}`;

    setFormData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.map((inc) =>
        inc === originalStr ? newIncStr : inc,
      ),
    }));

    setEditingInclusionStr(null);
    setEditInclusionData({ name: "", qty: "" });
  };

  const handleCancelEditInclusion = () => {
    setEditingInclusionStr(null);
    setEditInclusionData({ name: "", qty: "" });
  };

  // ============ HANDLERS - Add-ons ============
  const handleAddAddOn = (presetName) => {
    const nameToAdd = presetName || addOnInput.name;
    if (!nameToAdd.trim()) return;

    const newAddOnObj = {
      name: nameToAdd.trim(),
      qty: addOnInput.qty.trim() || "",
    };

    setFormData((prev) => ({
      ...prev,
      add_ons: [...prev.add_ons, newAddOnObj],
    }));

    setAddOnInput({
      name: "",
      qty: "",
    });
  };

  const handleRemoveAddOn = (index) => {
    setFormData((prev) => ({
      ...prev,
      add_ons: prev.add_ons.filter((_, i) => i !== index),
    }));
  };

  const handleStartEditAddOn = (idx, addOn) => {
    setEditingAddOnIdx(idx);
    setEditAddOnData({
      name: addOn.name,
      qty: addOn.qty || "",
    });
  };

  const handleSaveEditAddOn = (idx) => {
    if (!editAddOnData.name.trim()) return;
    setFormData((prev) => {
      const nextAddOns = [...prev.add_ons];
      nextAddOns[idx] = {
        name: editAddOnData.name.trim(),
        qty: editAddOnData.qty.trim() || "",
      };
      return { ...prev, add_ons: nextAddOns };
    });
    setEditingAddOnIdx(null);
    setEditAddOnData({ name: "", qty: "" });
  };

  const handleCancelEditAddOn = () => {
    setEditingAddOnIdx(null);
    setEditAddOnData({ name: "", qty: "" });
  };

  // Preset lists based directly on client catalog PDF
  const SETUP_PRESETS = [
    "Stage Setup", "Buffet Setup", "Balloon and Name Backdrop", "Couch",
    "Grass Carpet", "Cake Table", "Giveaway Rack", "Set Cover / Ribbons",
    "Round Tables", "Monoblock Chairs", "Tiffany Chairs", "Industrial Fan",
    "Water Station", "Red Carpet", "Centerpiece", "Dove", "Chandelier",
    "Separate Dining Setup for VIP", "Entourage Setup",
  ];

  const DINING_PRESETS = [
    "Food Warmer", "Serving Spoons", "Plates", "Cutlery Sets", "Glasses",
    "Highball Glass and Goblets", "Tissues", "Planggana", "Dishwashing Liquid",
    "Styrofoam Containers", "Ice Cooler", "Ice Cubes", "Mineral Water Gallon",
    "Water Jug", "Staff / Crew", "Tulyasi", "Tungko",
  ];

  const ADDON_PRESETS = [
    "Standee", "Entourage Setup", "Candy Corner", "Host", "Clown",
    "Cake", "Videoke", "Basic Lights & Sounds", "Pica-Pica Station", "Cake & Wine",
  ];

  const SCAFFOLD_PRESETS = [
    { label: "20x20 Setup", width_ft: 20, length_ft: 20, guest_min: 50, guest_max: 80 },
    { label: "20x40 Setup", width_ft: 20, length_ft: 40, guest_min: 100, guest_max: 150 },
    { label: "40x40 Setup", width_ft: 40, length_ft: 40, guest_min: 150, guest_max: 220 },
    { label: "20x60 Setup", width_ft: 20, length_ft: 60, guest_min: 180, guest_max: 250 },
    { label: "40x60 Setup", width_ft: 40, length_ft: 60, guest_min: 250, guest_max: 350 },
  ];

  const [editingScaffoldIdx, setEditingScaffoldIdx] = useState(null);
  const [editScaffoldData, setEditScaffoldData] = useState({
    label: "",
    width_ft: "",
    length_ft: "",
    guest_min: "",
    guest_max: "",
    free_setup: false,
  });

  // ============ HANDLERS - Scaffold Options ============
  const handleAddScaffoldOption = () => {
    const { label, width_ft, length_ft, guest_min, guest_max, free_setup } =
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
          free_setup: Boolean(free_setup),
        },
      ],
    }));
    // Cleared, not hidden. Hiding the form after one add is what left an offer
    // stranded at a single size with no way to add the rest.
    setNewScaffoldOption({
      label: "",
      width_ft: "",
      length_ft: "",
      guest_min: "",
      guest_max: "",
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
        // A default pointing at a size that no longer exists would silently
        // fall back to whatever happens to be first.
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
      free_setup: Boolean(opt.free_setup),
    });
  };

  const handleSaveEditScaffold = (idx) => {
    const { width_ft, length_ft, guest_min, guest_max, free_setup } =
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
    }));
  };

  // ============ HANDLERS - Combo food & inclusions ============
  // A combo's food is a written list: one row per dish, each naming the course
  // it belongs to. There is nothing to compute — what the admin types is what
  // the customer is served, which is the whole point of a combo.
  const handleAddFoodItem = () => {
    setFormData((prev) => {
      const items = prev.offer_food_items || [];
      pendingFoodFocus.current = items.length;
      return {
        ...prev,
        offer_food_items: [...items, { menu_category: "", item_name: "" }],
      };
    });
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

  /**
   * Moves a dish one place up or down.
   *
   * Order is stored (`sort_order`) and is the order the combo reads in
   * everywhere else, so it is worth being able to correct without deleting and
   * retyping the row.
   */
  const handleMoveFoodItem = (index, direction) => {
    setFormData((prev) => {
      const items = [...(prev.offer_food_items || [])];
      const target = index + direction;
      if (target < 0 || target >= items.length) return prev;
      [items[index], items[target]] = [items[target], items[index]];
      return { ...prev, offer_food_items: items };
    });
  };

  // Combo inclusions: plain lines, no inventory class. Duplicates are refused
  // rather than silently added, because two "Serving utensils" rows read as a
  // mistake on the customer's card.
  const handleAddComboInclusion = () => {
    const value = comboInclusionInput.trim();
    if (!value) return;
    const existing = formData.inclusions || [];
    if (existing.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
      notify(`"${value}" is already included.`, "error");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      inclusions: [...(prev.inclusions || []), value],
    }));
    setComboInclusionInput("");
  };

  const handleSaveComboInclusion = (index) => {
    const value = editComboInclusionValue.trim();
    if (!value) {
      notify("An inclusion needs a name.", "error");
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

  // Computed inclusion lists partitioned into the 2 inclusion classes
  const setupInclusions = (formData.inclusions || []).filter(
    (inc) => !isDiningInclusion(inc),
  );
  const diningInclusions = (formData.inclusions || []).filter(
    (inc) => isDiningInclusion(inc),
  );

  // Named apart from the state it reads so the inclusion section's three tabs
  // stay one concept. The section itself renders for regular packages only —
  // a combo's inclusions are plain lines with a section of their own.
  const inclusionTab = activeClassTab;

  // ============ HANDLERS - Form Submit ============
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Both types need a name and an event type. What they need beyond that
    // differs, because what they are priced on differs: an offer is sold at a
    // fixed rate per pax against its own guest count, a regular package at a
    // base setup price.
    if (!formData.name.trim() || !formData.event_type) {
      notify("Package name and event type are required.", "error");
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
        "Set the price per pax. A combo is priced from that rate times its guest count.",
        "error",
      );
      return;
    }

    if (isOffer && !(Number(formData.guest_count) >= 1)) {
      notify(
        "Set how many guests this combo serves. It must be at least 1.",
        "error",
      );
      return;
    }

    if (!isOffer && !formData.setup_price) {
      notify("Package name, event type, and base setup price are required.", "error");
      return;
    }

    if (formData.event_type === "Other" && !String(formData.event_type_other || "").trim()) {
      notify("Please specify the custom event type.", "error");
      return;
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

    setLoading(true);
    try {
      const data = new FormData();
      const isFoodOnly = formData.package_type === "Food Only";
      const normalizedInclusions = (formData.inclusions || [])
        .map((inc) => (isOffer ? String(inc).replace(/^\s*\[[^\]]*\]\s*/, "").trim() : inc))
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

      const normalizedFormData = {
        ...formData,
        event_type:
          formData.event_type === "Other"
            ? String(formData.event_type_other || "").trim() || "Other"
            : formData.event_type,
        // The event-space build, which only a regular package has.
        scaffold_size_options: isOffer || isFoodOnly
          ? []
          : (formData.scaffold_size_options || []).map((option) => ({
              ...option,
              price: option.free_setup ? 0 : Number(option.price) || 0,
              free_setup: Boolean(option.free_setup),
            })),
        default_scaffold_option_id: isOffer || isFoodOnly
          ? ""
          : formData.default_scaffold_option_id || "",
        setup_equipment: isOffer || isFoodOnly ? [] : formData.setup_equipment || [],
        add_ons: isOffer || isFoodOnly ? [] : formData.add_ons || [],
        inclusions: normalizedInclusions,
        // Only a Special Offer carries these.
        setup_price: isOffer ? "" : formData.setup_price || "",
        guest_count: isOffer ? formData.guest_count || "" : "",
        price_per_guest: isOffer ? formData.price_per_guest || "" : "",
        // Saved in the order shown; the server renumbers `sort_order` from it.
        offer_food_items: isOffer
          ? (formData.offer_food_items || [])
              .map((item) => ({
                menu_category: String(item.menu_category || "").trim(),
                item_name: String(item.item_name || "").trim(),
              }))
              .filter((item) => item.item_name)
          : [],
      };

      Object.keys(normalizedFormData).forEach((key) => {
        if (key === "inclusions") {
          normalizedFormData[key].forEach((val) => data.append(`${key}[]`, val));
        } else if (key === "setup_equipment" || key === "add_ons") {
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
        await AdminAPI.updatePackage(pkg._id, data);
        notify(`${noun} updated successfully`, "success");
      } else {
        await AdminAPI.createPackage(data);
        notify(`${noun} created successfully`, "success");
      }
      onSave();
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
      
      <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right overflow-hidden">
        {/* ============ HEADER ============ */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="flex items-center gap-2 font-bold text-foreground text-lg">
              {isOffer && <Sparkles size={17} className="text-amber-500" />}
              {isOffer
                ? pkg
                  ? "Edit Combo"
                  : "New Combo Pack"
                : pkg
                  ? "Edit Package"
                  : "Add New Package"}
            </h2>
            {!pkg && (
              <button
                type="button"
                onClick={() => setIsParserOpen(true)}
                className="group relative inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-violet-600/10 hover:from-blue-600/15 hover:via-indigo-600/15 hover:to-violet-600/15 px-3 py-1 text-xs font-bold text-indigo-600 border border-indigo-200/80 hover:border-indigo-300 shadow-xs hover:shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
                title="Automatically extract and populate package data using AI"
              >
                <Sparkles size={13} className="text-indigo-600 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                <span>Auto-Fill with AI</span>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
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
              {/* Package type. Prefilled from the tab the admin created from,
                  and still changeable here — one form, two kinds of record. */}
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1.5">
                  Package Type <span className="text-red-400">*</span>
                </label>
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
                        className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          selected
                            ? offerOption
                              ? "border-amber-400 bg-amber-50 ring-1 ring-amber-400"
                              : "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          {offerOption && (
                            <Sparkles size={13} className="text-amber-500" />
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

              {/* Event Type */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Event Type <span className="text-red-400">*</span>
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  value={formData.event_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      event_type: e.target.value,
                      event_type_other:
                        e.target.value === "Other" ? formData.event_type_other : "",
                    })
                  }
                >
                  <option value="">Select Event Type</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Christening">Christening</option>
                  <option value="Anniversary">Anniversary</option>
                  <option value="Other">Other</option>
                </select>
                {formData.event_type === "Other" && (
                  <input
                    type="text"
                    className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="Specify custom event type"
                    value={formData.event_type_other}
                    onChange={(e) =>
                      setFormData({ ...formData, event_type_other: e.target.value })
                    }
                  />
                )}
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

          {/* SECTION 3: Pricing & Guest Count --------------------------------
              What this package is sold on, and nothing else. A regular package
              is sold on a base set-up price; a combo on a guest count and a
              rate per pax, both fixed. Only the fields the chosen type actually
              uses are shown, so neither reads as half-filled. */}
          <section>
            <h3 className="font-bold text-foreground mb-1">
              {isOffer ? "Pricing & Guest Count" : "Pricing & Guest Rules"}
            </h3>
            <p className="mb-4 text-xs text-gray-500">
              {isOffer
                ? "Combo price = guest count × price per pax. Set-up, equipment and extras stay with the quotation."
                : "The starting price for this package. The quotation remains the final pricing authority."}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Base Setup Price — regular packages only. An offer is sold at
                  a rate per pax; what its set-up costs is settled on the
                  quotation, so asking for a figure here would invent one. */}
              {!isOffer && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Base Setup Price (₱) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="0"
                    value={formData.setup_price}
                    onChange={(e) => {
                      if (Number(e.target.value) < 0) return;
                      setFormData({ ...formData, setup_price: e.target.value });
                    }}
                  />
                </div>
              )}

              {/* ---- Combo pricing ----------------------------------------
                  A combo's own two numbers, and the total that follows from
                  them. All three are configuration: no figure lives in code. */}
              {isOffer && (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Guest Count (pax) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="w-full border border-amber-300 bg-amber-50/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                      placeholder="e.g. 10"
                      value={formData.guest_count}
                      onChange={(e) => {
                        if (Number(e.target.value) < 0) return;
                        setFormData({ ...formData, guest_count: e.target.value });
                      }}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      How many guests this combo serves. Customers book it for
                      exactly this number.
                    </p>
                  </div>

                  <div>
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

                  {/* The number the customer actually pays for the food, shown
                      as it is typed — the two fields above are easy to read as
                      a total when they are not one. */}
                  {comboTotal > 0 && (
                    <p className="col-span-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
                      Combo food price:{" "}
                      <strong>₱{comboTotal.toLocaleString("en-PH")}</strong> ·{" "}
                      {Number(formData.guest_count)} guests × ₱
                      {Number(formData.price_per_guest).toLocaleString("en-PH")}{" "}
                      per pax. Set-up, equipment and extras are quoted
                      separately.
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          {/* SECTION 4: Combo Food ------------------------------------------
              What the combo serves, written out. A combo is a decided meal, so
              this is a list rather than a set of rules: one row per dish, each
              naming the course it belongs to, in the order it is presented.

              Dish and course names are free text with suggestions drawn from
              the live menu — a combo may serve something the standing menu does
              not list, but the usual case is one keystroke and names that match
              the rest of the product. */}
          {isOffer && (
            <section>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-foreground">
                    <Sparkles size={15} className="text-amber-500" />
                    Combo Food <span className="text-red-400">*</span>
                  </h3>
                  <p className="text-xs text-gray-500">
                    Every dish this combo serves. Customers see exactly this
                    list — they choose nothing.
                  </p>
                </div>
                <Btn variant="secondary" size="sm" onClick={handleAddFoodItem}>
                  <Plus size={12} /> Add item
                </Btn>
              </div>

              <datalist id="combo-course-suggestions">
                {categorySuggestions.map((label) => (
                  <option key={label} value={label} />
                ))}
              </datalist>

              <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                {foodItems.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-amber-200 bg-white/60 py-6 text-center text-sm italic text-gray-400">
                    No food yet. Add the dishes this combo serves — e.g. Main
                    Course, Chicken BBQ.
                  </p>
                ) : (
                  foodItems.map((item, index) => (
                    <div
                      key={index}
                      ref={(node) => registerFoodRow(index, node)}
                      className="flex flex-wrap items-end gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2.5 shadow-2xs"
                    >
                      {/* Reordering: the stored order is the order the combo
                          reads in everywhere, so it is worth correcting in
                          place rather than by retyping the rows. */}
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => handleMoveFoodItem(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${item.item_name || "item"} up`}
                          className="rounded px-1 text-gray-400 transition-colors hover:text-primary disabled:opacity-30"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveFoodItem(index, 1)}
                          disabled={index === foodItems.length - 1}
                          aria-label={`Move ${item.item_name || "item"} down`}
                          className="rounded px-1 text-gray-400 transition-colors hover:text-primary disabled:opacity-30"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <div className="min-w-[9rem] flex-1">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          Menu category
                        </label>
                        <input
                          type="text"
                          list="combo-course-suggestions"
                          className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
                          placeholder="e.g. Main Course"
                          value={item.menu_category || ""}
                          onChange={(e) =>
                            handleUpdateFoodItem(index, {
                              menu_category: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="min-w-[11rem] flex-[2]">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                          Item name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          list={`combo-dish-suggestions-${index}`}
                          className={`w-full rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none ${
                            String(item.item_name || "").trim()
                              ? "border-gray-200 focus:border-amber-500"
                              : "border-red-300 focus:border-red-400"
                          }`}
                          placeholder="e.g. Chicken BBQ"
                          value={item.item_name || ""}
                          onChange={(e) =>
                            handleUpdateFoodItem(index, {
                              item_name: e.target.value,
                            })
                          }
                        />
                        <datalist id={`combo-dish-suggestions-${index}`}>
                          {dishSuggestionsFor(item.menu_category).map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFoodItem(index)}
                        className="mb-1 rounded p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Remove item"
                        aria-label={`Remove ${item.item_name || "item"}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}

                {/* The add control the admin actually reaches: right where the
                    last row ends, however many there are. */}
                <button
                  type="button"
                  onClick={handleAddFoodItem}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-white/70 py-2.5 text-sm font-semibold text-amber-700 transition-colors hover:border-amber-500 hover:bg-white"
                >
                  <Plus size={14} /> Add food item
                </button>
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
          {!isOffer && (
          <section>
            <div className="mb-4">
              <h3 className="font-bold text-foreground">Scaffold Size & Capacity</h3>
              <p className="text-xs text-gray-500">
                The event-space size this package is built for, and the guest
                range it fits. Pricing stays on the quotation.
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
              {/* Saved sizes. Each row is editable in place, so nothing has to
                  be deleted and re-entered to correct a number. */}
              {scaffoldOptions.length > 0 && (
                <ul className="space-y-2">
                  {scaffoldOptions.map((opt, idx) => {
                    const editing = editingScaffoldIdx === idx;

                    if (editing) {
                      return (
                        <li
                          key={idx}
                          className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 shadow-2xs"
                        >
                          <ScaffoldFields
                            value={editScaffoldData}
                            onChange={setEditScaffoldData}
                            compact
                          />
                          <div className="mt-2 flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEditScaffold(idx)}
                              className="flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-primary/90"
                            >
                              <Check size={12} /> Save
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditScaffold}
                              className="flex items-center gap-1 rounded bg-gray-200 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-300"
                            >
                              <X size={12} /> Cancel
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
                        className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white p-3 shadow-sm transition-colors hover:border-gray-200"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          {/* Only a list of several needs a default chosen. */}
                          {scaffoldOptions.length > 1 && (
                            <input
                              type="radio"
                              name="default_scaffold"
                              checked={isDefault}
                              onChange={() =>
                                handleSetDefaultScaffoldOption(opt._id || opt.id || idx)
                              }
                              className="shrink-0 accent-primary"
                              title="Show this size first"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {opt.label || `${opt.width_ft}ft × ${opt.length_ft}ft`}
                              {scaffoldOptions.length > 1 && isDefault && (
                                <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-500">
                              <span>
                                {opt.width_ft}ft × {opt.length_ft}ft
                              </span>
                              <span>·</span>
                              <span>{opt.area_ft2 || opt.width_ft * opt.length_ft} ft²</span>
                              {(opt.guest_min || opt.guest_max) && (
                                <>
                                  <span>·</span>
                                  <span className="font-medium text-primary">
                                    👥 {opt.guest_min || 0} – {opt.guest_max || "∞"} guests
                                  </span>
                                </>
                              )}
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
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditScaffold(idx, opt)}
                            className="rounded p-1 text-gray-400 transition-colors hover:bg-primary/5 hover:text-primary"
                            title="Edit size"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveScaffoldOption(idx)}
                            className="rounded p-1 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Remove size"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* The add form. It used to vanish the moment an option was added,
                  which left an offer stuck at one size with no way back — the
                  bug this replaces. An offer keeps the form available; a regular
                  package supports one size, so it offers "Replace" instead of a
                  second row. */}
              {canAddScaffold ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    {scaffoldOptions.length === 0 ? "Add a size" : "Add another size"}
                  </p>
                  <ScaffoldFields
                    value={newScaffoldOption}
                    onChange={setNewScaffoldOption}
                  />

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Btn
                      variant="primary"
                      size="sm"
                      onClick={handleAddScaffoldOption}
                      disabled={!newScaffoldOption.width_ft || !newScaffoldOption.length_ft}
                    >
                      <Plus size={12} className="mr-1" /> Add size
                    </Btn>
                    <span className="text-[11px] text-gray-400">
                      Standard sizes:
                    </span>
                    {SCAFFOLD_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyScaffoldPreset(preset)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 shadow-2xs transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2.5">
                  <p className="text-xs text-gray-500">
                    A regular package supports one size. Edit the one above, or
                    replace it.
                  </p>
                  <Btn
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        scaffold_size_options: [],
                        default_scaffold_option_id: "",
                      }));
                      setEditingScaffoldIdx(null);
                    }}
                  >
                    Replace size
                  </Btn>
                </div>
              )}

              {scaffoldOptions.length === 0 && (
                <p className="text-center text-xs italic text-gray-400">
                  No size configured yet.
                </p>
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. Buffet setup"
                    value={comboInclusionInput}
                    onChange={(e) => setComboInclusionInput(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter adds the line rather than submitting the form —
                      // typing six inclusions should not need six trips to the
                      // mouse.
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      handleAddComboInclusion();
                    }}
                  />
                  <Btn
                    variant="secondary"
                    size="sm"
                    onClick={handleAddComboInclusion}
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
                              autoFocus
                              className="flex-1 rounded border border-blue-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              value={editComboInclusionValue}
                              onChange={(e) =>
                                setEditComboInclusionValue(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                handleSaveComboInclusion(index);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveComboInclusion(index)}
                              className="flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                            >
                              <Check size={12} /> Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingComboInclusionIdx(null)}
                              className="rounded px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100"
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
                  activeClassTab === "setup"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>🎪</span>
                <span className="truncate">Event Setup & Furniture</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shrink-0">
                  {setupInclusions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveClassTab("dining")}
                className={`flex-1 py-2 px-1 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeClassTab === "dining"
                    ? "bg-white text-primary shadow-xs font-bold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>🍽️</span>
                <span className="truncate">Dining & Service</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shrink-0">
                  {diningInclusions.length}
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
                <span className="truncate">ADD ONS</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-bold border border-gray-200 shrink-0">
                  {(formData.add_ons || []).length}
                </span>
              </button>
            </div>
            )}

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 space-y-4">
              {/* TAB 1: Event Setup & Furniture */}
              {inclusionTab === "setup" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🎪</span>
                      <label className="font-semibold text-gray-800 text-sm">
                        Event Setup & Furniture Inclusions
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Stage, backdrops, tables, chairs, lighting & venue furniture shown to customers.
                    </p>

                    {/* Add Setup Item Form */}
                    <div className="flex gap-2 mb-3 items-center w-full">
                      <input
                        type="text"
                        placeholder="Item name (e.g. Stage Setup, Round Tables, Couch)"
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={setupInput.name}
                        onChange={(e) =>
                          setSetupInput({ ...setupInput, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSetupInclusion();
                          }
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Qty (e.g. 6, 60)"
                        className="w-24 shrink-0 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={setupInput.qty}
                        onChange={(e) =>
                          setSetupInput({ ...setupInput, qty: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSetupInclusion();
                          }
                        }}
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

                    {/* Quick Presets Chips */}
                    <div className="mb-1">
                      <p className="text-[11px] text-gray-400 font-medium mb-1.5">
                        Quick Add Presets from Catalog:
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {SETUP_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddSetupInclusion(preset)}
                            className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary transition-all shadow-2xs hover:bg-primary/5 flex items-center gap-1"
                          >
                            <Plus size={10} /> {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Active List */}
                  {setupInclusions.length > 0 ? (
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {setupInclusions.map((inc, i) => {
                        const parsed = parseInclusion(inc);
                        const isEditing = editingInclusionStr === inc;

                        if (isEditing) {
                          return (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm bg-blue-50/70 p-2 rounded-lg border border-blue-200 shadow-2xs"
                            >
                              <input
                                type="text"
                                className="flex-1 min-w-0 border border-blue-300 rounded-md px-2.5 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editInclusionData.name}
                                onChange={(e) =>
                                  setEditInclusionData({
                                    ...editInclusionData,
                                    name: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditInclusion(
                                      "Event Setup & Furniture",
                                      inc,
                                    );
                                  } else if (e.key === "Escape") {
                                    handleCancelEditInclusion();
                                  }
                                }}
                                autoFocus
                              />
                              <input
                                type="text"
                                placeholder="Qty"
                                className="w-20 shrink-0 border border-blue-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editInclusionData.qty}
                                onChange={(e) =>
                                  setEditInclusionData({
                                    ...editInclusionData,
                                    qty: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditInclusion(
                                      "Event Setup & Furniture",
                                      inc,
                                    );
                                  } else if (e.key === "Escape") {
                                    handleCancelEditInclusion();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveEditInclusion(
                                    "Event Setup & Furniture",
                                    inc,
                                  )
                                }
                                className="p-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-2xs shrink-0"
                                title="Save changes"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditInclusion}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors shrink-0"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li
                            key={i}
                            className="flex justify-between items-center text-sm bg-white px-3 py-2.5 rounded-lg border border-gray-100 shadow-2xs gap-2 hover:border-gray-200 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                              <span className="font-medium text-gray-800 break-words">
                                {parsed.name}
                              </span>
                              {parsed.qty && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
                                  × {parsed.qty}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditInclusion(inc)}
                                className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                                title="Edit item"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveInclusionString(inc)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-gray-200">
                      No event setup & furniture items added yet
                    </p>
                  )}
                </div>
              )}

              {/* TAB 2: Dining & Service Inventory */}
              {inclusionTab === "dining" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🍽️</span>
                      <label className="font-semibold text-gray-800 text-sm">
                        Dining & Service Inventory Inclusions
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Food warmers, tableware, cutlery, drinkware, service supplies & crew counts.
                    </p>

                    {/* Add Dining Item Form */}
                    <div className="flex gap-2 mb-3 items-center w-full">
                      <input
                        type="text"
                        placeholder="Item name (e.g. Food Warmer, Plates, Staff / Crew)"
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={diningInput.name}
                        onChange={(e) =>
                          setDiningInput({ ...diningInput, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddDiningInclusion();
                          }
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Qty (e.g. 7, 150, 4-8)"
                        className="w-24 shrink-0 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={diningInput.qty}
                        onChange={(e) =>
                          setDiningInput({ ...diningInput, qty: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddDiningInclusion();
                          }
                        }}
                      />
                      <Btn
                        variant="primary"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleAddDiningInclusion()}
                        disabled={!diningInput.name.trim()}
                      >
                        <Plus size={14} className="mr-1" /> Add
                      </Btn>
                    </div>

                    {/* Quick Presets Chips */}
                    <div className="mb-1">
                      <p className="text-[11px] text-gray-400 font-medium mb-1.5">
                        Quick Add Presets from Catalog:
                      </p>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {DINING_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddDiningInclusion(preset)}
                            className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary transition-all shadow-2xs hover:bg-primary/5 flex items-center gap-1"
                          >
                            <Plus size={10} /> {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Active List */}
                  {diningInclusions.length > 0 ? (
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {diningInclusions.map((inc, i) => {
                        const parsed = parseInclusion(inc);
                        const isEditing = editingInclusionStr === inc;

                        if (isEditing) {
                          return (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm bg-emerald-50/70 p-2 rounded-lg border border-emerald-200 shadow-2xs"
                            >
                              <input
                                type="text"
                                className="flex-1 min-w-0 border border-emerald-300 rounded-md px-2.5 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editInclusionData.name}
                                onChange={(e) =>
                                  setEditInclusionData({
                                    ...editInclusionData,
                                    name: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditInclusion(
                                      "Dining & Service Inventory",
                                      inc,
                                    );
                                  } else if (e.key === "Escape") {
                                    handleCancelEditInclusion();
                                  }
                                }}
                                autoFocus
                              />
                              <input
                                type="text"
                                placeholder="Qty"
                                className="w-20 shrink-0 border border-emerald-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editInclusionData.qty}
                                onChange={(e) =>
                                  setEditInclusionData({
                                    ...editInclusionData,
                                    qty: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditInclusion(
                                      "Dining & Service Inventory",
                                      inc,
                                    );
                                  } else if (e.key === "Escape") {
                                    handleCancelEditInclusion();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveEditInclusion(
                                    "Dining & Service Inventory",
                                    inc,
                                  )
                                }
                                className="p-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-2xs shrink-0"
                                title="Save changes"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditInclusion}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors shrink-0"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li
                            key={i}
                            className="flex justify-between items-center text-sm bg-white px-3 py-2.5 rounded-lg border border-gray-100 shadow-2xs gap-2 hover:border-gray-200 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                              <span className="font-medium text-gray-800 break-words">
                                {parsed.name}
                              </span>
                              {parsed.qty && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
                                  × {parsed.qty}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditInclusion(inc)}
                                className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                                title="Edit item"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveInclusionString(inc)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove item"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400 italic text-center py-4 bg-white/50 rounded-lg border border-dashed border-gray-200">
                      No dining & service inventory items added yet
                    </p>
                  )}
                </div>
              )}

              {/* TAB 3: ADD ONS */}
              {inclusionTab === "addons" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">✨</span>
                      <label className="font-semibold text-gray-800 text-sm">
                        Optional Add-ons (ADDS ON)
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      Extra options and entertainment packages customers can select during booking.
                    </p>

                    {/* Add Add-on Form */}
                    <div className="flex gap-2 mb-3 items-center w-full">
                      <input
                        type="text"
                        placeholder="Item name (e.g. Videoke, Host, Clown)"
                        className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary"
                        value={addOnInput.name}
                        onChange={(e) =>
                          setAddOnInput({ ...addOnInput, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddAddOn();
                          }
                        }}
                      />

                      <input
                        type="text"
                        placeholder="Qty (e.g. 1, 5, 2-4)"
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
                      <p className="text-[11px] text-gray-400 font-medium mb-1.5">
                        Quick Add Presets from Catalog:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {ADDON_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddAddOn(preset)}
                            className="text-xs px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-600 hover:text-primary hover:border-primary transition-all shadow-2xs hover:bg-primary/5 flex items-center gap-1"
                          >
                            <Plus size={10} /> {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Active List */}
                  {(formData.add_ons || []).length > 0 ? (
                    <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {formData.add_ons.map((add, i) => {
                        const isEditing = editingAddOnIdx === i;

                        if (isEditing) {
                          return (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm bg-purple-50/70 p-2 rounded-lg border border-purple-200 shadow-2xs"
                            >
                              <input
                                type="text"
                                className="flex-1 min-w-0 border border-purple-300 rounded-md px-2.5 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editAddOnData.name}
                                onChange={(e) =>
                                  setEditAddOnData({
                                    ...editAddOnData,
                                    name: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditAddOn(i);
                                  } else if (e.key === "Escape") {
                                    handleCancelEditAddOn();
                                  }
                                }}
                                autoFocus
                              />
                              <input
                                type="text"
                                placeholder="Qty"
                                className="w-20 shrink-0 border border-purple-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editAddOnData.qty}
                                onChange={(e) =>
                                  setEditAddOnData({
                                    ...editAddOnData,
                                    qty: e.target.value,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveEditAddOn(i);
                                  } else if (e.key === "Escape") {
                                    handleCancelEditAddOn();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditAddOn(i)}
                                className="p-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors shadow-2xs shrink-0"
                                title="Save changes"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditAddOn}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-md transition-colors shrink-0"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </li>
                          );
                        }

                        return (
                          <li
                            key={i}
                            className="flex justify-between items-center text-sm bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-2xs gap-2 hover:border-gray-200 transition-colors"
                          >
                            <span className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full shrink-0" />
                              <span className="font-medium text-gray-800 break-words">
                                {add.name}
                              </span>
                              {add.qty && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 shrink-0">
                                  × {add.qty}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEditAddOn(i, add)}
                                className="p-1 text-gray-400 hover:text-primary hover:bg-primary/5 rounded transition-colors"
                                title="Edit add-on"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAddOn(i)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove add-on"
                              >
                                <Trash2 size={13} />
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
                  )}
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
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : pkg ? "Save Changes" : "Create Package"}
          </Btn>
        </div>
      </div>
    </div>
    </>
  );
}
