import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import OcularDatePickerModal from "../../components/customer/OcularDatePickerModal";
import { isOcularEligibleBooking } from "../../utils/ocularEligibility";
import { getBookingOcularActionMeta } from "../../utils/ocularStatusHelper";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { getEventThumbnail } from "../../utils/eventThumbnails";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import {
  bookingStatusGroup,
  bookingStatusMeta,
  recordTitle,
  resolveServiceType,
} from "../../components/customer/portal/statusMeta";
import { isSpecialOffer } from "../../lib/specialOffers";
import { formatCurrency, formatEventDateWithDay, formatShortDate } from "../../utils/format";
import { cn } from "@/lib/utils";
import {
  Plus,
  CreditCard,
  Search,
  XCircle,
  ChevronDown,
  ChevronRight,
  MapPin,
  Users,
  Calendar,
  Utensils,
  FileText,
  ArrowLeft,
  SlidersHorizontal,
  Check,
  Package,
  ArrowRight,
  CalendarClock,
  Eye,
} from "lucide-react";

const SERVICE_TYPES = ["Food Only", "Event Setup Only", "Food and Event Setup"];

export default function CustomerBookings() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [_menuCatalog, setMenuCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters, Search, Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Mobile View Toggle: 'list' | 'detail'
  const [mobileView, setMobileView] = useState("list");

  // Selected Booking for Overview Pane
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  // Ocular Modal State
  const [requestingOcularBooking, setRequestingOcularBooking] = useState(null);
  const [isSubmittingOcular, setIsSubmittingOcular] = useState(false);

  const submitOcularRequest = async (selectedDate, selectedTime) => {
    if (!requestingOcularBooking?._id) return;
    try {
      setIsSubmittingOcular(true);
      await CustomerAPI.requestOcular(requestingOcularBooking._id, {
        scheduled_date: selectedDate,
        scheduled_time: selectedTime,
      });
      notify("Ocular visit requested successfully!", "success");
      setRequestingOcularBooking(null);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to request ocular visit.", "error");
    } finally {
      setIsSubmittingOcular(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [bRes, pRes, pkgRes, menuRes] = await Promise.all([
        CustomerAPI.getBookings(),
        CustomerAPI.getPayments(),
        CustomerAPI.getPackages(),
        CustomerAPI.getMenu().catch(() => ({ data: [] })),
      ]);
      setBookings(bRes.data || []);
      setPayments(pRes.data || []);
      setPackages(pkgRes.data || []);
      setMenuCatalog(menuRes.data || []);
    } catch {
      notify("Failed to load booking details.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Outstanding balance per booking
  const balanceOf = useMemo(() => {
    return (booking) => {
      if (!booking) return 0;
      const total = Number(booking.total_price || 0);
      const rawPaid = payments
        .filter(
          (p) =>
            String(p.booking_id?._id || p.booking_id) === String(booking._id) &&
            p.status === "approved"
        )
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const paid = total > 0 ? Math.min(rawPaid, total) : rawPaid;
      return Math.max(0, total - paid);
    };
  }, [payments]);

  // Filtered & Sorted Bookings List
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        if (statusFilter !== "all" && bookingStatusGroup(booking) !== statusFilter) {
          return false;
        }
        if (serviceTypeFilter !== "all" && resolveServiceType(booking) !== serviceTypeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const ref = (booking.reference || "").toLowerCase();
          const type = (booking.event_type || "").toLowerCase();
          const name = `${booking.contact_first_name || ""} ${booking.contact_last_name || ""}`.toLowerCase();
          const city = (booking.municipality || booking.province || "").toLowerCase();

          return ref.includes(q) || type.includes(q) || name.includes(q) || city.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return timeA - timeB;
        }
        if (sortBy === "date") {
          const timeA = new Date(a.event_date || 0).getTime();
          const timeB = new Date(b.event_date || 0).getTime();
          return timeA - timeB;
        }
        // Default: newest
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
  }, [bookings, statusFilter, serviceTypeFilter, searchQuery, sortBy]);
  const isFiltered = Boolean(searchQuery.trim()) || statusFilter !== "all" || serviceTypeFilter !== "all";

  // Dynamically derive configured Combo Pack names from packages and existing bookings
  const comboPackNames = useMemo(() => {
    const names = new Set();
    (packages || []).forEach((pkg) => {
      if (pkg.offer_type === "special" || isSpecialOffer(pkg)) {
        if (pkg.name) names.add(pkg.name);
      }
    });
    (bookings || []).forEach((bkg) => {
      const isSpecial =
        bkg.booking_type === "special" ||
        bkg.package_id?.offer_type === "special" ||
        bkg.event_type === "Special Offer Catering" ||
        Boolean(bkg.package_id?.is_special_offer) ||
        (Array.isArray(bkg.offer_food_snapshot) && bkg.offer_food_snapshot.length > 0);
      if (isSpecial) {
        const name = bkg.package_name_snapshot || bkg.package_id?.name || bkg.package_name;
        if (name) names.add(name);
      }
    });
    return Array.from(names);
  }, [packages, bookings]);

  // Auto-select first booking for desktop pane
  useEffect(() => {
    if (filteredBookings.length > 0) {
      if (!selectedBookingId || !filteredBookings.some((b) => b._id === selectedBookingId)) {
        setSelectedBookingId(filteredBookings[0]._id);
      }
    } else {
      setSelectedBookingId(null);
    }
  }, [filteredBookings, selectedBookingId]);

  const selectedBooking = useMemo(() => {
    return bookings.find((b) => b._id === selectedBookingId) || filteredBookings[0] || null;
  }, [bookings, filteredBookings, selectedBookingId]);

  const handleSelectBooking = (id) => {
    setSelectedBookingId(id);
    setMobileView("detail");
  };

  const startCheckout = async (booking) => {
    const amount = balanceOf(booking);
    if (amount <= 0) {
      notify("This booking is fully paid.", "info");
      return;
    }
    try {
      notify("Generating checkout session for payment...", "info");
      const isDeposit = (booking.status || "").toLowerCase().includes("deposit");
      const checkoutRes = await CustomerAPI.createPaymentCheckout({
        booking_id: booking._id,
        amount,
        payment_type: isDeposit ? "deposit" : "final",
      });

      if (checkoutRes.data?.checkout_url) {
        notify("Redirecting to PayMongo checkout...", "success");
        window.location.assign(checkoutRes.data.checkout_url);
      } else {
        notify("Could not generate payment URL.", "error");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to start payment checkout.", "error");
    }
  };

  // Modern Compact Dotless Status Badge - Distinct from Buttons
  const renderStatusBadge = (bkg) => {
    const bal = balanceOf(bkg);
    const meta = bookingStatusMeta(bkg, { balance: bal });
    let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/80";

    if (meta.tone === "warning") {
      badgeClass = "bg-amber-50 text-amber-800 border-amber-200/80";
    } else if (meta.tone === "info") {
      badgeClass = "bg-blue-50 text-blue-700 border-blue-200/80";
    } else if (meta.tone === "danger" || meta.tone === "neutral") {
      badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
    }

    return (
      <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border inline-flex items-center gap-1.5 shrink-0 select-none", badgeClass)}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span>{meta.label}</span>
      </span>
    );
  };

  // Dynamic Card Action Button renderer with explicit icons - Error prevention: only valid actions
  const renderCardActionButton = (bkg) => {
    const bal = balanceOf(bkg);
    const statusLower = (bkg.status || "").toLowerCase();
    const isDepositNeeded = statusLower.includes("deposit") || (bkg.payment_status === "deposit_pending" && bal > 0);
    const isBalanceOwed = bal > 0 && ["confirmed", "converted to booking", "preparing", "ocular scheduled", "ready for event"].includes(statusLower);
    const isOcularEligible = isOcularEligibleBooking(bkg) && (!bkg.ocular_visit || bkg.ocular_visit.status === "none");

    if (isDepositNeeded) {
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              startCheckout(bkg);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 rounded-md shrink-0 cursor-pointer shadow-2xs gap-1.5 active:scale-[0.98]"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pay Deposit</span>
          </Button>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2C4B8A] group-hover:translate-x-0.5 transition-all hidden md:block" />
        </div>
      );
    }

    if (isBalanceOwed) {
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              startCheckout(bkg);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 rounded-md shrink-0 cursor-pointer shadow-2xs gap-1.5 active:scale-[0.98]"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pay Balance</span>
          </Button>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2C4B8A] group-hover:translate-x-0.5 transition-all hidden md:block" />
        </div>
      );
    }

    if (isOcularEligible) {
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setRequestingOcularBooking(bkg);
            }}
            className="border-slate-200 text-[#2C4B8A] hover:bg-blue-50 font-semibold text-xs h-8 px-3 rounded-md shrink-0 cursor-pointer gap-1.5"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Schedule Ocular</span>
          </Button>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2C4B8A] group-hover:translate-x-0.5 transition-all hidden md:block" />
        </div>
      );
    }

    // Explicit View Button when no secondary action is required
    return (
      <Button
        size="sm"
        variant="outline"
        className="border-slate-200 text-[#2C4B8A] group-hover:border-[#2C4B8A] group-hover:bg-[#2C4B8A] group-hover:text-white font-semibold text-xs h-8 px-3 rounded-md shrink-0 cursor-pointer shadow-2xs gap-1 transition-all"
      >
        <span>View</span>
        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
      </Button>
    );
  };

  const selectedMeta = useMemo(
    () => bookingStatusMeta(selectedBooking, { balance: balanceOf(selectedBooking) }),
    [selectedBooking, balanceOf]
  );

  // Determine active step index (0-3) for 4-Step Catering Journey Timeline
  const activeBookingStep = useMemo(() => {
    if (!selectedBooking) return 2;
    const statusLower = (selectedBooking.status || "").toLowerCase();
    if (["preparing", "ongoing", "ready for event", "completed"].includes(statusLower)) return 3;
    if (["confirmed", "converted to booking", "ocular scheduled"].includes(statusLower)) return 2;
    if (statusLower.includes("deposit")) return 2;
    return 2;
  }, [selectedBooking]);

  return (
    <CustomerDashboardLayout fullBleed>
      <div className="h-[calc(100vh-3.5rem)] w-full bg-[#F8FAFC] flex flex-col font-sans antialiased overflow-hidden">
        {/* CLEAN TOP PAGE HEADER */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              My Bookings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track confirmed event reservations, monitor preparation progress, and access event details.
            </p>
          </div>

          <Button
            onClick={() => navigate("/customer/book", { state: { resetWizard: true } })}
            className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-xs rounded-md font-semibold text-xs h-9 px-4 shrink-0 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>New Request</span>
          </Button>
        </div>

        {/* WORKSPACE AREA: FULL CONTENT WIDTH */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row p-6 gap-6 w-full">
          {/* LEFT MAIN SECTION: UNBOXED LIST AREA WITH SEARCH & FILTERS ABOVE */}
          <div
            className={cn(
              "flex-1 min-w-0 flex flex-col space-y-4 overflow-hidden",
              mobileView === "detail" ? "hidden md:flex" : "flex"
            )}
          >
            {/* SEARCH & FILTERS MOVED ABOVE THE LIST */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by event name or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-md border border-slate-200/90 focus:border-[#2C4B8A] focus:ring-2 focus:ring-[#2C4B8A]/10 outline-none transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
                {/* Status Dropdown Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 rounded-md shadow-2xs gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>
                        {statusFilter === "all"
                          ? "All bookings"
                          : statusFilter === "confirmed"
                          ? "Confirmed"
                          : statusFilter === "deposit_needed"
                          ? "Deposit Needed"
                          : statusFilter === "completed"
                          ? "Completed"
                          : "Cancelled"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-lg border-slate-200">
                    <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Filter Status
                    </DropdownMenuLabel>
                    {[
                      { id: "all", label: "All bookings" },
                      { id: "confirmed", label: "Confirmed" },
                      { id: "deposit_needed", label: "Deposit Needed" },
                      { id: "completed", label: "Completed" },
                      { id: "cancelled", label: "Cancelled" },
                    ].map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => setStatusFilter(item.id)}
                        className={cn(
                          "text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          statusFilter === item.id ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                        )}
                      >
                        <span>{item.label}</span>
                        {statusFilter === item.id && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Service Type Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 rounded-md shadow-2xs gap-1.5 cursor-pointer shrink-0",
                        serviceTypeFilter !== "all" && "bg-blue-50 text-[#2C4B8A] border-blue-200"
                      )}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#2C4B8A]" />
                      <span>{serviceTypeFilter === "all" ? "All Services" : serviceTypeFilter}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5 shadow-lg border-slate-200 max-h-96 overflow-y-auto [scrollbar-width:thin]">
                    <DropdownMenuItem
                      onClick={() => setServiceTypeFilter("all")}
                      className={cn(
                        "text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                        serviceTypeFilter === "all" ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                      )}
                    >
                      <span>All Services</span>
                      {serviceTypeFilter === "all" && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1 bg-slate-100" />

                    {/* Category 1: Regular Package */}
                    <DropdownMenuLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider px-2 pt-2 pb-1 select-none">
                      Regular Package
                    </DropdownMenuLabel>
                    {["Regular Package", "Regular Package + Menu"].map((opt) => (
                      <DropdownMenuItem
                        key={opt}
                        onClick={() => setServiceTypeFilter(opt)}
                        className={cn(
                          "text-xs font-medium pl-3 pr-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          serviceTypeFilter === opt ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                        )}
                      >
                        <span>{opt}</span>
                        {serviceTypeFilter === opt && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator className="my-1 bg-slate-100" />

                    {/* Category 2: Combo Packs */}
                    <DropdownMenuLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider px-2 pt-2 pb-1 select-none">
                      Combo Packs
                    </DropdownMenuLabel>
                    {comboPackNames.length > 0 ? (
                      comboPackNames.map((name) => (
                        <DropdownMenuItem
                          key={name}
                          onClick={() => setServiceTypeFilter(name)}
                          className={cn(
                            "text-xs font-medium pl-3 pr-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                            serviceTypeFilter === name ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                          )}
                        >
                          <span className="truncate">{name}</span>
                          {serviceTypeFilter === name && <Check className="w-3.5 h-3.5 text-[#2C4B8A] shrink-0" />}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="px-3 py-1 text-[11px] text-slate-400 italic">No combo packs configured</div>
                    )}

                    <DropdownMenuSeparator className="my-1 bg-slate-100" />

                    {/* Category 3: Request Custom */}
                    <DropdownMenuLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider px-2 pt-2 pb-1 select-none">
                      Request Custom
                    </DropdownMenuLabel>
                    {["Food Only", "Event Setup Only", "Food and Event Setup"].map((opt) => (
                      <DropdownMenuItem
                        key={opt}
                        onClick={() => setServiceTypeFilter(opt)}
                        className={cn(
                          "text-xs font-medium pl-3 pr-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          serviceTypeFilter === opt ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                        )}
                      >
                        <span>{opt}</span>
                        {serviceTypeFilter === opt && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort Order */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 rounded-md shadow-2xs gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>
                        {sortBy === "newest"
                          ? "Newest first"
                          : sortBy === "oldest"
                          ? "Oldest first"
                          : "Event date"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5 shadow-lg border-slate-200">
                    <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Sort Order
                    </DropdownMenuLabel>
                    {[
                      { id: "newest", label: "Newest first" },
                      { id: "oldest", label: "Oldest first" },
                      { id: "date", label: "Event date" },
                    ].map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => setSortBy(item.id)}
                        className={cn(
                          "text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          sortBy === item.id ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                        )}
                      >
                        <span>{item.label}</span>
                        {sortBy === item.id && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* UNBOXED BOOKINGS CARDS LIST */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 [scrollbar-width:thin]">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
                  Loading bookings...
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center my-4 shadow-2xs">
                  <FileText className="w-10 h-10 text-slate-300 mb-2" />
                  <h3 className="text-sm font-bold text-slate-800 font-sans">No bookings found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">
                    {isFiltered
                      ? "Try clearing active search or filters to see other bookings."
                      : "No active bookings yet. Convert an inquiry to book your event."}
                  </p>
                  {isFiltered && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setServiceTypeFilter("all");
                      }}
                      className="mt-4 text-xs font-semibold rounded-md border-slate-200"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              ) : (
                filteredBookings.map((bkg) => {
                  const isSelected = bkg._id === selectedBookingId;
                  const refCode = bkg.reference || `BKG-${bkg._id.substring(0, 6).toUpperCase()}`;
                  const thumbnail = getEventThumbnail(bkg);
                  const titleStr = recordTitle(bkg);
                  const bal = balanceOf(bkg);
                  const meta = bookingStatusMeta(bkg, { balance: bal });
                  const locationStr = [bkg.municipality, bkg.province].filter(Boolean).join(", ") || bkg.venue_address || "Location TBD";
                  const ocularMeta = getBookingOcularActionMeta(bkg);

                  return (
                    <div
                      key={bkg._id}
                      onClick={() => handleSelectBooking(bkg._id)}
                      className={cn(
                        "group p-4 rounded-xl border transition-all cursor-pointer relative shadow-2xs",
                        isSelected
                          ? "bg-blue-50/40 border-l-4 border-l-blue-600 border-y border-r border-blue-200/90 shadow-sm"
                          : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs"
                      )}
                    >
                      {/* STRICT 12-COLUMN GRID ROW ALIGNMENT */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 md:gap-4 items-center">
                        {/* Cols 1-5: Thumbnail Image & Core Specs */}
                        <div className="md:col-span-5 flex items-start gap-3.5 min-w-0">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={titleStr}
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover border border-slate-200/80 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-[#2C4B8A]/10 to-blue-100/60 border border-[#2C4B8A]/20 flex items-center justify-center text-[#2C4B8A] shrink-0 shadow-2xs">
                              <Utensils className="w-6 h-6 sm:w-7 sm:h-7 opacity-80" />
                            </div>
                          )}

                          <div className="min-w-0 space-y-1">
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate font-sans group-hover:text-[#2C4B8A] transition-colors">
                              {titleStr}
                            </h3>

                            <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {resolveServiceType(bkg)}
                              </span>
                              <span>•</span>
                              <span>{formatShortDate(bkg.event_date)}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                {bkg.guest_count ? `${bkg.guest_count} guests` : "Guests TBD"}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{locationStr}</span>
                            </div>

                            <div className="text-[11px] font-mono text-slate-400 pt-0.5">
                              Ref: {refCode}
                            </div>
                          </div>
                        </div>

                        {/* Cols 6-9: Modern Dotless Status Badge & Notice Sentence */}
                        <div className="md:col-span-4 space-y-1.5 min-w-0">
                          {renderStatusBadge(bkg)}
                          <p className="text-xs text-slate-500 leading-snug line-clamp-2">
                            {meta.notice?.text || "Your event booking is confirmed and registered."}
                          </p>
                        </div>

                        {/* Cols 10-12: Action Area (Right-Aligned, Valid Actions Only) */}
                        <div className="md:col-span-3 flex items-center justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                          <span className="text-xs text-slate-400 font-medium md:hidden flex items-center gap-1">
                            <span>Tap to view summary</span>
                          </span>
                          {renderCardActionButton(bkg)}
                        </div>
                      </div>

                      {/* Ocular / Next Step Action Reminder Strip */}
                      {ocularMeta && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customer/bookings/${bkg._id}`);
                          }}
                          className={cn(
                            "mt-3 pt-2.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-all cursor-pointer group/strip",
                            ocularMeta.state === "action_required"
                              ? "bg-amber-50/80 border-amber-200/80 hover:bg-amber-100/70 text-amber-950"
                              : ocularMeta.state === "scheduled"
                              ? "bg-blue-50/70 border-blue-200/80 hover:bg-blue-100/60 text-blue-950"
                              : ocularMeta.state === "requested"
                              ? "bg-amber-50/60 border-amber-200/70 hover:bg-amber-100/50 text-amber-950"
                              : "bg-emerald-50/60 border-emerald-200/70 hover:bg-emerald-100/50 text-emerald-950"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                ocularMeta.state === "action_required"
                                  ? "bg-orange-500 animate-pulse"
                                  : ocularMeta.state === "scheduled"
                                  ? "bg-blue-600"
                                  : ocularMeta.state === "requested"
                                  ? "bg-amber-500"
                                  : "bg-emerald-600"
                              )}
                            />
                            <span className="font-bold uppercase tracking-wider text-[10px] shrink-0 opacity-90">
                              {ocularMeta.headline}
                            </span>
                            <span className="hidden sm:inline text-slate-300">•</span>
                            <span className="truncate font-medium text-xs">
                              {ocularMeta.subheadline}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 font-semibold text-[11px] shrink-0 sm:ml-auto text-[#2C4B8A] group-hover/strip:underline">
                            <span>{ocularMeta.state === "action_required" ? "Schedule ocular visit →" : "View details →"}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT ACTION & FINANCIAL TRACKER SIDE PANEL WITH PINNED FOOTER LAYOUT */}
          <div
            className={cn(
              "w-full md:w-[340px] lg:w-[360px] xl:w-[380px] shrink-0 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex flex-col h-full max-h-full min-h-0 overflow-hidden",
              mobileView === "list" ? "hidden md:flex" : "flex"
            )}
          >
            {/* Mobile Back Button */}
            <div className="md:hidden px-3.5 py-2.5 border-b border-slate-100 shrink-0 bg-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView("list")}
                className="text-xs font-semibold text-[#2C4B8A] gap-1 p-0 hover:bg-transparent cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Bookings List
              </Button>
            </div>

            {selectedBooking ? (() => {
              const totalCost = Number(selectedBooking.total_price || 0);
              const bal = balanceOf(selectedBooking);
              const paidAmount = Math.max(0, totalCost - bal);
              const percentPaid = totalCost > 0 ? Math.min(100, Math.round((paidAmount / totalCost) * 100)) : 100;
              const isDepositNeeded = (selectedBooking.status || "").toLowerCase().includes("deposit") || (selectedBooking.payment_status === "deposit_pending" && bal > 0);

              return (
                <>
                  {/* TOP HEADER: SELECTED BOOKING & STATUS BADGE */}
                  <div className="p-3.5 pb-2.5 border-b border-slate-100 shrink-0 bg-white">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Booking</span>
                        <h3 className="font-bold text-base text-slate-900 font-sans leading-snug truncate">
                          {recordTitle(selectedBooking)}
                        </h3>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          Ref: {selectedBooking.reference || `BKG-${selectedBooking._id.substring(0, 6).toUpperCase()}`}
                        </div>
                      </div>
                      {renderStatusBadge(selectedBooking)}
                    </div>
                  </div>

                  {/* SCROLLABLE CONTENT AREA */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5 [scrollbar-width:thin]">
                    {/* 4-STEP CATERING JOURNEY PROGRESSION TRACKER - COMPACT */}
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2.5 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Catering Journey Progress
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold relative pt-0.5 pb-0.5">
                        {/* Connecting Background Line */}
                        <div className="absolute top-3.5 left-3 right-3 h-0.5 bg-slate-200 -z-0" />
                        {/* Active Filled Progress Line */}
                        <div
                          className="absolute top-3.5 left-3 h-0.5 bg-blue-600 transition-all duration-300 -z-0"
                          style={{ width: `${(activeBookingStep / 3) * 100}%` }}
                        />

                        {[
                          { label: "Inquiry", step: 0 },
                          { label: "Quotation", step: 1 },
                          { label: "Booking", step: 2 },
                          { label: "Event", step: 3 },
                        ].map((s) => {
                          const isDone = activeBookingStep > s.step;
                          const isCurrent = activeBookingStep === s.step;

                          return (
                            <div key={s.label} className="flex flex-col items-center gap-0.5 z-10">
                              <div
                                className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all shadow-2xs",
                                  isDone
                                    ? "bg-emerald-600 text-white"
                                    : isCurrent
                                    ? "bg-blue-600 text-white ring-3 ring-blue-600/15 scale-105"
                                    : "bg-white text-slate-400 border border-slate-300"
                                )}
                              >
                                {isDone ? <Check className="w-3 h-3" /> : s.step + 1}
                              </div>
                              <span
                                className={cn(
                                  "text-[10px] font-medium leading-tight",
                                  isCurrent ? "font-bold text-blue-900" : isDone ? "text-slate-700" : "text-slate-400"
                                )}
                              >
                                {s.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ACTION REQUIRED / GUIDANCE BOX - COMPACT */}
                    <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-2.5 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[10px]">
                          <ArrowRight className="w-3 h-3" />
                        </span>
                        <h4 className="font-bold text-[#1E3563] text-[11px] uppercase tracking-wider font-sans">
                          {isDepositNeeded ? "Payment Required" : "Booking Status"}
                        </h4>
                      </div>

                      <p className="text-slate-700 text-xs leading-snug font-medium">
                        {selectedMeta.notice?.text || "Your event booking is registered and being prepared."}
                      </p>

                      {/* Direct Action Button */}
                      {isDepositNeeded && bal > 0 && (
                        <Button
                          onClick={() => startCheckout(selectedBooking)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-7.5 rounded-md cursor-pointer shadow-xs gap-1.5 mt-0.5 active:scale-[0.98]"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pay Deposit Now ({formatCurrency(bal)})</span>
                        </Button>
                      )}
                    </div>

                    {/* OCULAR / NEXT ACTION REMINDER BOX */}
                    {(() => {
                      const selectedOcular = getBookingOcularActionMeta(selectedBooking);
                      if (!selectedOcular) return null;

                      return (
                        <div
                          onClick={() => navigate(`/customer/bookings/${selectedBooking._id}`)}
                          className={cn(
                            "border rounded-lg p-2.5 space-y-1.5 cursor-pointer transition-all shadow-2xs group/oc",
                            selectedOcular.state === "action_required"
                              ? "bg-gradient-to-r from-amber-50 to-orange-50/50 border-amber-200/90 hover:border-amber-300"
                              : selectedOcular.state === "scheduled"
                              ? "bg-blue-50/70 border-blue-200/80 hover:border-blue-300"
                              : selectedOcular.state === "requested"
                              ? "bg-amber-50/60 border-amber-200/70 hover:border-amber-300"
                              : "bg-emerald-50/60 border-emerald-200/70"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={cn(
                                  "w-2 h-2 rounded-full shrink-0",
                                  selectedOcular.state === "action_required"
                                    ? "bg-orange-500 animate-pulse"
                                    : selectedOcular.state === "scheduled"
                                    ? "bg-blue-600"
                                    : selectedOcular.state === "requested"
                                    ? "bg-amber-500"
                                    : "bg-emerald-600"
                                )}
                              />
                              <h4 className="font-bold text-[#1E3563] text-[11px] uppercase tracking-wider font-sans truncate">
                                {selectedOcular.headline}: {selectedOcular.subheadline}
                              </h4>
                            </div>
                            <span className="text-[10px] font-semibold text-[#2C4B8A] flex items-center gap-0.5 shrink-0 group-hover/oc:underline">
                              <span>{selectedOcular.state === "action_required" ? "Schedule" : "Details"}</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                          <p className="text-slate-700 text-xs leading-snug font-medium">
                            {selectedOcular.description}
                          </p>
                        </div>
                      );
                    })()}

                    {/* FINANCIAL & PAYMENT TRACKER CARD - COMPACT */}
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment Status</span>
                        <span className="font-mono text-xs font-bold text-slate-700">{percentPaid}% Paid</span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            percentPaid === 100 ? "bg-emerald-600" : percentPaid > 0 ? "bg-blue-600" : "bg-amber-500"
                          )}
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Total Cost</div>
                          <div className="font-bold text-slate-900 font-mono text-xs">{formatCurrency(totalCost)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Balance Due</div>
                          <div className={cn("font-bold font-mono text-xs", bal > 0 ? "text-amber-700" : "text-emerald-700")}>
                            {bal > 0 ? formatCurrency(bal) : "Fully Settled"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* COMPACT KEY EVENT SPECS */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-2.5 space-y-1 text-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        Event Summary
                      </div>
                      <div className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-200/60 text-xs">
                        <span className="text-slate-500 font-medium">Event Date</span>
                        <span className="font-semibold text-slate-900">{formatEventDateWithDay(selectedBooking.event_date)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-200/60 text-xs">
                        <span className="text-slate-500 font-medium">Guest Count</span>
                        <span className="font-semibold text-slate-900">{selectedBooking.guest_count ? `${selectedBooking.guest_count} guests` : "TBD"}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-200/60 text-xs">
                        <span className="text-slate-500 font-medium">Service Type</span>
                        <span className="font-semibold text-slate-900">{resolveServiceType(selectedBooking)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 py-0.5 text-xs">
                        <span className="text-slate-500 font-medium">Venue</span>
                        <span className="font-semibold text-slate-900 truncate max-w-[160px]">
                          {[selectedBooking.municipality, selectedBooking.province].filter(Boolean).join(", ") || selectedBooking.venue_address || "Location TBD"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FIXED FOOTER: VIEW FULL DETAILS ACTION */}
                  <div className="p-3.5 bg-white border-t border-slate-100 shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/customer/bookings/${selectedBooking._id}`)}
                      className="w-full border-blue-200 bg-blue-50/40 hover:bg-blue-100/60 text-[#1E3563] font-bold text-xs h-8.5 rounded-md cursor-pointer shadow-2xs gap-1.5 shrink-0 transition-all flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4 text-[#1E3563]" />
                      <span>View Full Details</span>
                      <ChevronRight className="w-4 h-4 text-[#1E3563]" />
                    </Button>
                  </div>
                </>
              );
            })() : (
              <div className="p-8 text-center text-slate-400 text-xs my-auto">
                Select a booking to view summary.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REUSED MODALS */}
      {requestingOcularBooking && (
        <OcularDatePickerModal
          isOpen={Boolean(requestingOcularBooking)}
          onClose={() => setRequestingOcularBooking(null)}
          onSubmit={submitOcularRequest}
          isSubmitting={isSubmittingOcular}
          eventDate={requestingOcularBooking?.event_date}
          eventTitle={requestingOcularBooking?.event_type}
        />
      )}
    </CustomerDashboardLayout>
  );
}
