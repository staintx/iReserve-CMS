import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { StaffAPI } from "../../api/staff";
import StaffLayout from "../../components/layout/StaffLayout";
import Badge from "../../components/admin/ui/Badge";
import useToast from "../../hooks/useToast";
import useAuth from "../../hooks/useAuth";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Phone,
  Mail,
  UserCheck,
  Sparkles,
  Info,
  AlertCircle,
  Lock,
  Utensils,
  Layers,
  Banknote,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import { 
  getEventTimingStatus, 
  getBookingVenueLocation, 
  formatEventStartTime 
} from "../../utils/format";

export default function StaffEventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadEvent = async (options = {}) => {
    const isSilent = typeof options === "boolean" ? options : Boolean(options?.silent);
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const res = await StaffAPI.getBooking(id);
      setBooking(res.data);
    } catch (err) {
      console.error(err);
      if (!isSilent) {
        notify("Failed to load assigned event details.", "error");
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadEvent();
  }, [id]);

  useRealTimeRefresh((data) => {
    if (data?.booking_id && String(data.booking_id) !== String(id)) {
      return;
    }
    loadEvent({ silent: true });
  }, ["booking"]);

  const myRole = useMemo(() => {
    if (!booking) return "Crew";
    const assignments = booking.staff_assignments || [];
    const match = assignments.find((item) => String(item.user_id?._id || item.user_id) === String(user?._id));
    return match?.role || user?.position || "Crew Member";
  }, [booking, user]);

  const timing = useMemo(() => getEventTimingStatus(booking), [booking]);

  const teamByRole = useMemo(() => {
    if (!booking) return {};
    const map = {};
    (booking.staff_assignments || []).forEach((a) => {
      const role = a.role || "Staff";
      map[role] = map[role] || [];
      map[role].push(a);
    });
    return map;
  }, [booking]);

  const hasSupportingInfo = useMemo(() => {
    if (!booking) return false;
    const hasMenu = (booking.menu_items || []).length > 0;
    const hasServices = (booking.service_items || []).length > 0 || (booking.additional_charges || []).length > 0;
    const hasCrew = (booking.staff_assignments || []).length > 0;
    return hasMenu || hasServices || hasCrew;
  }, [booking]);

  if (loading) {
    return (
      <StaffLayout>
        <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200/80 rounded-xl">
          Loading assigned event details...
        </div>
      </StaffLayout>
    );
  }

  if (!booking) {
    return (
      <StaffLayout>
        <div className="p-8 text-center space-y-3 bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
          <AlertCircle size={32} className="mx-auto text-amber-600" />
          <h2 className="text-base font-bold text-slate-900">Event Not Found</h2>
          <p className="text-xs text-slate-500">The assigned event could not be found or you are not assigned to it.</p>
          <button
            type="button"
            onClick={() => navigate("/staff/bookings")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
          >
            Back to Bookings
          </button>
        </div>
      </StaffLayout>
    );
  }

  const manager = booking.event_manager_id || null;
  const isCompleted = ["completed", "Completed"].includes(booking.status);
  const venueLocation = getBookingVenueLocation(booking);
  const locationAddress =
    venueLocation !== "Location not specified"
      ? venueLocation
      : "Address details will be confirmed by lead.";
  const locationQuery = [booking.street, booking.barangay, booking.municipality, booking.province].filter(Boolean).join(", ") || (booking.location || "");

  return (
    <StaffLayout>
      <div className="space-y-4">
        {/* Back navigation */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/staff/bookings")}
            className="-ml-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to My Bookings</span>
          </button>
        </div>

        {/* Unified Work Document Container */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs divide-y divide-slate-100 overflow-hidden">
          
          {/* SECTION 1: Event Name & Current Event Status */}
          <div className="p-4 sm:p-5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Catering Assignment
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                  {booking.event_type || "Catering Event"}
                </h1>
                <p className="text-xs text-slate-500">
                  Client: <strong className="text-slate-800">{booking.customer_id?.full_name || "Valued Client"}</strong> · Reference: <span className="font-mono text-slate-700 font-semibold">{booking.reference || booking._id?.slice(-6).toUpperCase()}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 self-start">
                {isCompleted ? (
                  <>
                    <Badge status={booking.status || "Completed"} />
                    <span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Completed
                    </span>
                  </>
                ) : (
                  timing.isStarted && !timing.isFinished && (
                    <span className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <Sparkles size={12} className="text-emerald-600" /> In Progress
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2: Date, Time, and Venue */}
          <div className="p-4 sm:p-5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Date, Time &amp; Venue
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Calendar size={14} className="text-[#4C81E0]" />
                  <span>Date &amp; Schedule</span>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {booking.event_date
                    ? new Date(booking.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                    : "Date TBA"}
                </div>
                <div className="text-slate-600 flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" />
                  <span>{formatEventStartTime(booking.start_time)}</span>
                </div>
                {booking.guest_count > 0 && (
                  <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                    {booking.guest_count} guests · {booking.package_id?.name || booking.package_name_snapshot || "Standard Catering"}
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <MapPin size={14} className="text-[#4C81E0]" />
                    <span>Venue Location</span>
                  </div>
                  {locationQuery && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-[#4C81E0] hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Open in Google Maps
                    </a>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-900 leading-snug">
                  {locationAddress}
                </div>
                {booking.venue_type && (
                  <div className="text-slate-500 text-xs">
                    Venue Type: {booking.venue_type}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: Staff Member's Assigned Role */}
          <div className="p-4 sm:p-5 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Your Assigned Role
            </h2>
            <div className="flex items-center justify-between p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#D6E4F7] text-[#4C81E0] font-bold flex items-center justify-center shrink-0">
                  <UserCheck size={16} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{myRole}</div>
                  <div className="text-[11px] text-slate-500">Catering Operations Crew</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-white border border-slate-200 text-xs font-semibold text-slate-700">
                {isCompleted ? "Completed Shift" : "Active Assignment"}
              </span>
            </div>
          </div>

          {/* SECTION 4: Event Lead / Manager */}
          <div className="p-4 sm:p-5 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Event Lead / Manager
            </h2>
            {manager ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#D6E4F7] text-[#4C81E0] font-bold flex items-center justify-center text-xs shrink-0">
                    {manager.full_name?.slice(0, 2).toUpperCase() || "MG"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{manager.full_name}</div>
                    <div className="text-[11px] text-slate-500">Lead Event Coordinator</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {manager.phone && (
                    <a
                      href={`tel:${manager.phone}`}
                      className="inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4C81E0] text-white text-xs font-bold hover:bg-[#3b6bc4] transition-colors"
                    >
                      <Phone size={13} />
                      <span>Call Lead ({manager.phone})</span>
                    </a>
                  )}
                  {manager.email && (
                    <a
                      href={`mailto:${manager.email}`}
                      className="inline-flex min-h-[36px] items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      <Mail size={13} />
                      <span className="hidden sm:inline">{manager.email}</span>
                      <span className="sm:hidden">Email</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                Lead coordinator not designated yet.
              </p>
            )}
          </div>

          {/* SECTION 5: Important Event Instructions and Briefing */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Info size={14} className="text-[#4C81E0]" />
              <h2>Important Event Instructions &amp; Briefing</h2>
            </div>

            <div className="p-3.5 sm:p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
              <span className="font-bold block text-slate-900 text-sm">
                Dietary &amp; Special Requests
              </span>
              <p className="text-slate-700 leading-relaxed text-xs sm:text-[13px] pt-0.5">
                {booking.dietary_restrictions ? `Dietary: ${booking.dietary_restrictions}. ` : ""}
                {booking.allergies ? `Allergies: ${booking.allergies}. ` : ""}
                {booking.special_requests ? `Special: ${booking.special_requests}. ` : ""}
                {booking.notes || (!booking.dietary_restrictions && !booking.allergies && !booking.special_requests ? "Standard catering protocol applies. No special dietary restrictions noted." : "")}
              </p>
            </div>

            {Number(booking.remaining_balance || 0) > 0 && booking.balance_payment_preference === "in_person" && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
                <Banknote size={16} className="text-amber-600 shrink-0" />
                <div>
                  <strong>Cash Collection:</strong> Client elected to pay the remaining balance of <strong>₱{Number(booking.remaining_balance).toLocaleString()}</strong> in cash on-site to the event lead.
                </div>
              </div>
            )}
          </div>

          {/* SECTION: Supporting Information (Menu, Services, Crew Roster) */}
          {hasSupportingInfo && (
            <div className="p-4 sm:p-5 space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Supporting Information
              </h2>

              {/* Menu Items */}
              {booking.menu_items && booking.menu_items.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Utensils size={14} className="text-[#4C81E0]" />
                    <span>Catering Menu ({booking.menu_items.length} Dishes)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {booking.menu_items.map((dish, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{dish.name || dish.dish_id?.name || "Catering Dish"}</span>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">{dish.category || dish.dish_id?.category || "Main"}</span>
                        </div>
                        {dish.special_instructions && (
                          <div className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200">
                            {dish.special_instructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-on Services */}
              {((booking.service_items && booking.service_items.length > 0) || (booking.additional_charges && booking.additional_charges.length > 0)) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Layers size={14} className="text-[#4C81E0]" />
                    <span>Add-on Services &amp; Setup Requirements</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {(booking.service_items || []).map((srv, idx) => (
                      <div key={`srv-${idx}`} className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900 block">{srv.name}</span>
                          {srv.note && <span className="text-[11px] text-slate-500 block">{srv.note}</span>}
                        </div>
                        {srv.quantity > 1 && (
                          <span className="text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Qty: {srv.quantity}
                          </span>
                        )}
                      </div>
                    ))}
                    {(booking.additional_charges || []).map((chg, idx) => (
                      <div key={`chg-${idx}`} className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80 text-xs">
                        <span className="font-bold text-slate-900 block">{chg.label}</span>
                        {chg.reason && <span className="text-[11px] text-slate-500 block">{chg.reason}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Catering Crew */}
              {booking.staff_assignments && booking.staff_assignments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Users size={14} className="text-[#4C81E0]" />
                    <span>Assigned Crew on Duty ({booking.staff_assignments.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(teamByRole).map(([roleName, members]) => (
                      <div key={roleName} className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          {roleName} ({members.length})
                        </span>
                        <div className="space-y-1">
                          {members.map((member, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs font-semibold text-slate-800 py-0.5">
                              <span className="truncate">{member.name || member.user_id?.full_name || "Crew Member"}</span>
                              {member.phone && (
                                <a 
                                  href={`tel:${member.phone}`}
                                  className="text-[11px] text-[#4C81E0] hover:underline inline-flex items-center gap-1 shrink-0"
                                >
                                  <Phone size={10} /> {member.phone}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </StaffLayout>
  );
}
