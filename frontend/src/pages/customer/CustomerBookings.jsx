import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import OcularDatePickerModal from "../../components/customer/OcularDatePickerModal";
import { isOcularEligibleBooking } from "../../utils/ocularEligibility";
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
} from "../../components/ui/dropdown-menu";
import {
  bookingStatusGroup,
  bookingStatusMeta,
  recordTitle,
  resolveServiceType,
} from "../../components/customer/portal/statusMeta";
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
  const [menuCatalog, setMenuCatalog] = useState([]);
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
    } catch (err) {
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

  // Modern Compact Dotless Status Badge
  const renderStatusBadge = (bkg) => {
    const bal = balanceOf(bkg);
    const meta = bookingStatusMeta(bkg, { balance: bal });
    let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200/90";

    if (meta.tone === "warning") {
      badgeClass = "bg-amber-50 text-amber-800 border-amber-200/90";
    } else if (meta.tone === "info") {
      badgeClass = "bg-blue-50 text-blue-700 border-blue-200/90";
    } else if (meta.tone === "danger" || meta.tone === "neutral") {
      badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
    }

    return (
      <span className={cn("px-2.5 py-1 rounded-md text-xs font-semibold border tracking-tight inline-flex items-center shadow-2xs whitespace-nowrap shrink-0", badgeClass)}>
        {meta.label}
      </span>
    );
  };

  // Dynamic Card Action Button renderer with explicit icons
  const renderCardActionButton = (bkg, isSelected) => {
    const bal = balanceOf(bkg);
    const isDepositNeeded = (bkg.status || "").toLowerCase().includes("deposit") || (bal > 0 && bkg.status !== "completed" && bkg.status !== "cancelled");
    const isOcularEligible = isOcularEligibleBooking(bkg) && (!bkg.ocular_visit || bkg.ocular_visit.status === "none");

    if (isDepositNeeded && bal > 0) {
      return (
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            startCheckout(bkg);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-3.5 rounded-lg shrink-0 cursor-pointer shadow-2xs gap-1.5"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Pay Deposit</span>
        </Button>
      );
    }

    if (isOcularEligible) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            setRequestingOcularBooking(bkg);
          }}
          className="border-slate-200 text-[#2C4B8A] hover:bg-blue-50 font-semibold text-xs h-9 px-3.5 rounded-lg shrink-0 cursor-pointer gap-1.5"
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span>Schedule Ocular</span>
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant={isSelected ? "default" : "outline"}
        onClick={(e) => {
          e.stopPropagation();
          handleSelectBooking(bkg._id);
        }}
        className={cn(
          "font-semibold text-xs h-9 px-3.5 rounded-lg shrink-0 cursor-pointer transition-all gap-1.5",
          isSelected
            ? "bg-[#1E3563] hover:bg-[#152547] text-white shadow-2xs"
            : "border-slate-200 text-slate-700 hover:bg-slate-50 bg-white"
        )}
      >
        <Eye className="w-3.5 h-3.5" />
        <span>View booking</span>
      </Button>
    );
  };

  const selectedMeta = useMemo(
    () => bookingStatusMeta(selectedBooking, { balance: balanceOf(selectedBooking) }),
    [selectedBooking, balanceOf]
  );

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
            className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-xs rounded-lg font-semibold text-xs h-9 px-4 shrink-0 cursor-pointer transition-all active:scale-[0.98]"
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
                  className="w-full pl-9 pr-8 py-2 bg-white text-xs text-slate-900 placeholder:text-slate-400 rounded-lg border border-slate-200/90 focus:border-[#2C4B8A] focus:ring-2 focus:ring-[#2C4B8A]/10 outline-none transition-all shadow-2xs"
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
                      className="h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 rounded-lg shadow-2xs gap-1.5 cursor-pointer shrink-0"
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
                        "h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 rounded-lg shadow-2xs gap-1.5 cursor-pointer shrink-0",
                        serviceTypeFilter !== "all" && "bg-blue-50 text-[#2C4B8A] border-blue-200"
                      )}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#2C4B8A]" />
                      <span>{serviceTypeFilter === "all" ? "All Services" : serviceTypeFilter}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5 shadow-lg border-slate-200">
                    <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                      Filter Service Type
                    </DropdownMenuLabel>
                    {[
                      { id: "all", label: "All Services" },
                      ...SERVICE_TYPES.map((t) => ({ id: t, label: t })),
                    ].map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => setServiceTypeFilter(item.id)}
                        className={cn(
                          "text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          serviceTypeFilter === item.id ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold" : "text-slate-700"
                        )}
                      >
                        <span>{item.label}</span>
                        {serviceTypeFilter === item.id && <Check className="w-3.5 h-3.5 text-[#2C4B8A]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort Order */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 rounded-lg shadow-2xs gap-1.5 cursor-pointer shrink-0"
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
                      className="mt-4 text-xs font-semibold rounded-lg border-slate-200"
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

                  return (
                    <div
                      key={bkg._id}
                      onClick={() => handleSelectBooking(bkg._id)}
                      className={cn(
                        "p-4 rounded-xl border transition-all cursor-pointer relative shadow-2xs hover:border-slate-300 hover:shadow-xs",
                        isSelected
                          ? "bg-[#F4F7FC] border-l-4 border-l-[#2C4B8A] border-y border-r border-slate-300/90"
                          : "bg-white border-slate-200/90"
                      )}
                    >
                      {/* STRICT 12-COLUMN GRID ROW ALIGNMENT */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Cols 1-5: Thumbnail Image & Core Specs */}
                        <div className="md:col-span-5 flex items-start gap-3.5 min-w-0">
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={titleStr}
                              className="w-16 h-16 rounded-lg object-cover border border-slate-200/80 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#2C4B8A]/10 to-blue-100/60 border border-[#2C4B8A]/20 flex items-center justify-center text-[#2C4B8A] shrink-0 shadow-2xs">
                              <Utensils className="w-7 h-7 opacity-80" />
                            </div>
                          )}

                          <div className="min-w-0 space-y-1">
                            <h3 className="font-bold text-base text-slate-900 truncate font-sans group-hover:text-[#2C4B8A] transition-colors">
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

                        {/* Cols 10-12: Action Area (Right-Aligned) */}
                        <div className="md:col-span-3 flex items-center justify-start md:justify-end shrink-0">
                          {renderCardActionButton(bkg, isSelected)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT OVERVIEW SIDE PANEL (ALWAYS VISIBLE ABOVE THE FOLD) */}
          <div
            className={cn(
              "w-full md:w-[340px] lg:w-[360px] xl:w-[380px] shrink-0 bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col justify-between space-y-4 h-fit max-h-[calc(100vh-6.5rem)] overflow-y-auto [scrollbar-width:thin]",
              mobileView === "list" ? "hidden md:flex" : "flex"
            )}
          >
            {/* Mobile Back Button */}
            <div className="md:hidden pb-2 border-b border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView("list")}
                className="text-xs font-semibold text-[#2C4B8A] gap-1 p-0 hover:bg-transparent cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Bookings List
              </Button>
            </div>

            {selectedBooking ? (
              <div className="space-y-4">
                {/* Compact Hero Package Thumbnail Header */}
                <div className="relative rounded-lg overflow-hidden border border-slate-200/80 bg-slate-100 h-28 sm:h-32 group shadow-2xs shrink-0">
                  {getEventThumbnail(selectedBooking) ? (
                    <img
                      src={getEventThumbnail(selectedBooking)}
                      alt={recordTitle(selectedBooking)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#2C4B8A]/10 via-blue-50 to-indigo-100/60 flex flex-col items-center justify-center text-[#2C4B8A]">
                      <Utensils className="w-8 h-8 opacity-80 mb-0.5" />
                      <span className="text-[11px] font-semibold opacity-70">Custom Event Package</span>
                    </div>
                  )}

                  {/* Overlaid Top-Left Status Pill */}
                  <div className="absolute top-2.5 left-2.5">
                    {renderStatusBadge(selectedBooking)}
                  </div>
                </div>

                {/* Event Title & Ref */}
                <div>
                  <h3 className="font-bold text-lg text-slate-900 font-sans leading-snug">
                    {recordTitle(selectedBooking)}
                  </h3>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    Ref: {selectedBooking.reference || `BKG-${selectedBooking._id.substring(0, 6).toUpperCase()}`}
                  </div>
                </div>

                {/* Compact Spec Rows */}
                <div className="border-t border-slate-100 pt-3 space-y-2.5">
                  <div className="flex items-start gap-2.5 text-xs">
                    <Calendar className="w-3.5 h-3.5 text-[#2C4B8A] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-slate-400 font-semibold text-[10px] uppercase">Event date</div>
                      <div className="font-bold text-slate-800">
                        {formatEventDateWithDay(selectedBooking.event_date)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs">
                    <Users className="w-3.5 h-3.5 text-[#2C4B8A] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-slate-400 font-semibold text-[10px] uppercase">Guest count</div>
                      <div className="font-bold text-slate-800">
                        {selectedBooking.guest_count ? `${selectedBooking.guest_count} guests` : "Guests TBD"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs">
                    <Utensils className="w-3.5 h-3.5 text-[#2C4B8A] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-slate-400 font-semibold text-[10px] uppercase">Service type</div>
                      <div className="font-bold text-slate-800">
                        {resolveServiceType(selectedBooking)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs">
                    <MapPin className="w-3.5 h-3.5 text-[#2C4B8A] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-slate-400 font-semibold text-[10px] uppercase">Venue</div>
                      <div className="font-bold text-slate-800">
                        {[selectedBooking.municipality, selectedBooking.province].filter(Boolean).join(", ") || selectedBooking.venue_address || "Location TBD"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs">
                    <Package className="w-3.5 h-3.5 text-[#2C4B8A] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-slate-400 font-semibold text-[10px] uppercase">Package</div>
                      <div className="font-bold text-slate-800">
                        {selectedBooking.package_name || selectedBooking.package_id?.name || "Custom Event Package"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Next Step Callout Box */}
                <div className="bg-blue-50/80 border border-blue-100/90 rounded-lg p-3 flex items-start gap-2.5 text-xs">
                  <div className="w-7 h-7 rounded-full bg-[#2C4B8A] text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1E3563] text-xs">Next step</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                      {selectedMeta.notice?.text || "Your event booking is confirmed and being prepared."}
                    </p>
                  </div>
                </div>

                {/* Bottom Full-Width "View Full Details >" Button - VISIBLE ABOVE THE FOLD */}
                <Button
                  variant="outline"
                  onClick={() => navigate(`/customer/bookings/${selectedBooking._id}`)}
                  className="w-full border-slate-200 hover:bg-slate-50 text-[#1E3563] font-bold text-xs h-9 rounded-lg cursor-pointer shadow-2xs gap-1.5 shrink-0"
                >
                  <span>View full details</span>
                  <ChevronRight className="w-4 h-4 text-[#1E3563]" />
                </Button>
              </div>
            ) : (
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
        />
      )}
    </CustomerDashboardLayout>
  );
}
