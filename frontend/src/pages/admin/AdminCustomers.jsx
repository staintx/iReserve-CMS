import React, { useState, useEffect, useMemo } from "react";
import { 
  Eye, 
  Mail, 
  Phone, 
  Star, 
  Users, 
  UserCheck, 
  CalendarCheck, 
  DollarSign, 
  Calendar, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  Award, 
  ExternalLink,
  X,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import Badge from "../../components/admin/ui/Badge";
import Btn from "../../components/admin/ui/Btn";

import { useNavigate } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import DataTable from "../../components/admin/table/DataTable";
import TableToolbar from "../../components/admin/table/TableToolbar";
import FilterPopover from "../../components/admin/table/FilterPopover";
import FilterChip from "../../components/admin/table/FilterChip";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";

export default function AdminCustomers() {
  const { notify } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerRow, setDrawerRow] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Advanced filters
  const [minSpend, setMinSpend] = useState("");
  const [draftMinSpend, setDraftMinSpend] = useState("");
  const [maxSpend, setMaxSpend] = useState("");
  const [draftMaxSpend, setDraftMaxSpend] = useState("");
  const [minReservations, setMinReservations] = useState("");
  const [draftMinReservations, setDraftMinReservations] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [draftStatusFilter, setDraftStatusFilter] = useState("all");

  const fetchCustomers = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [cRes, bRes] = await Promise.all([
        AdminAPI.getCustomers(),
        AdminAPI.getBookings().catch(() => ({ data: [] })),
      ]);
      setCustomers(Array.isArray(cRes.data) ? cRes.data : []);
      setBookings(Array.isArray(bRes.data) ? bRes.data : []);
      if (isManualRefresh) {
        notify("Customer list updated", "success");
      }
    } catch {
      notify("Failed to load customers", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Keyboard accessibility: ESC closes drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && drawerRow) {
        setDrawerRow(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerRow]);

  const handleToggleStatus = async (customer) => {
    const newStatus = customer.is_active === false ? true : false;
    const actionText = newStatus ? "activate" : "deactivate";

    try {
      await AdminAPI.updateCustomerStatus(customer._id, { is_active: newStatus });
      setCustomers((prev) =>
        prev.map((c) => (c._id === customer._id ? { ...c, is_active: newStatus } : c))
      );
      if (drawerRow && drawerRow._id === customer._id) {
        setDrawerRow((prev) => ({ ...prev, is_active: newStatus }));
      }
      notify(`Customer account ${newStatus ? "activated" : "deactivated"} successfully`, "success");
    } catch {
      notify(`Failed to ${actionText} customer account`, "error");
    }
  };

  const handleCopy = (text, key) => {
    if (!text || text === "—" || text === "N/A") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    notify(`Copied ${key} to clipboard`, "success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Associated bookings for the selected drawer customer
  const customerBookings = useMemo(() => {
    if (!drawerRow?._id) return [];
    const customerIdStr = String(drawerRow._id);
    const customerEmail = (drawerRow.email || "").trim().toLowerCase();

    return bookings
      .filter((b) => {
        const bCustId = b.customer_id?._id
          ? String(b.customer_id._id)
          : b.customer_id
          ? String(b.customer_id)
          : null;
        if (bCustId && bCustId === customerIdStr) return true;
        if (customerEmail && b.contact_email && b.contact_email.trim().toLowerCase() === customerEmail) {
          return true;
        }
        return false;
      })
      .sort((a, b) => new Date(b.event_date || b.createdAt || 0) - new Date(a.event_date || a.createdAt || 0));
  }, [drawerRow, bookings]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = customers.length;
    const bookers = customers.filter((c) => (c.reservations || 0) > 0);
    const bookerCount = bookers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + (Number(c.spending) || 0), 0);
    const avgSpend = bookerCount > 0 ? totalRevenue / bookerCount : 0;

    return {
      total,
      bookerCount,
      totalRevenue,
      avgSpend,
    };
  }, [customers]);

  // Activity filter options (Replacing legacy Tiers)
  const quickFilters = [
    { value: "all", label: "All Customers" },
    { value: "bookers", label: "Active Bookers" },
    { value: "prospects", label: "New Prospects" },
    { value: "active", label: "Active Accounts" },
    { value: "inactive", label: "Inactive Accounts" },
  ];

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      // Search (Name, Email, Phone)
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (c.full_name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q);

      // Quick activity tab filter
      let matchQuick = true;
      if (activityFilter === "bookers") matchQuick = (c.reservations || 0) > 0;
      else if (activityFilter === "prospects") matchQuick = (c.reservations || 0) === 0;
      else if (activityFilter === "active") matchQuick = c.is_active !== false;
      else if (activityFilter === "inactive") matchQuick = c.is_active === false;

      // Advanced filters
      const matchMinSpend = !minSpend || Number(c.spending || 0) >= Number(minSpend);
      const matchMaxSpend = !maxSpend || Number(c.spending || 0) <= Number(maxSpend);
      const matchMinRes = !minReservations || Number(c.reservations || 0) >= Number(minReservations);

      let matchStatus = true;
      if (statusFilter === "active") matchStatus = c.is_active !== false;
      if (statusFilter === "inactive") matchStatus = c.is_active === false;

      return matchSearch && matchQuick && matchMinSpend && matchMaxSpend && matchMinRes && matchStatus;
    });
  }, [customers, search, activityFilter, minSpend, maxSpend, minReservations, statusFilter]);

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const activeAdvancedCount =
    (minSpend ? 1 : 0) +
    (maxSpend ? 1 : 0) +
    (minReservations ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const columns = [
    {
      key: "name",
      header: "Customer",
      render: (c) => {
        const initials = (c.full_name || "?")
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent/25 to-accent/40 border border-accent/40 flex items-center justify-center text-xs font-bold text-accent-foreground shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-900 hover:text-primary transition-colors truncate">
                {c.full_name || "Unnamed Customer"}
              </span>
              <span className="text-xs text-gray-500 truncate">
                Joined {formatDate(c.createdAt)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "contact",
      header: "Contact Info",
      render: (c) => (
        <div className="flex flex-col gap-0.5 text-xs">
          {c.email ? (
            <a
              href={`mailto:${c.email}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-gray-700 hover:text-primary hover:underline transition-colors"
            >
              <Mail size={12} className="text-gray-400 shrink-0" />
              <span className="truncate max-w-[190px]">{c.email}</span>
            </a>
          ) : (
            <span className="text-gray-400 flex items-center gap-1.5"><Mail size={12} /> No email</span>
          )}
          {c.phone ? (
            <a
              href={`tel:${c.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Phone size={12} className="text-gray-400 shrink-0" />
              <span>{c.phone}</span>
            </a>
          ) : (
            <span className="text-gray-400 flex items-center gap-1.5"><Phone size={12} /> No phone</span>
          )}
        </div>
      ),
    },
    {
      key: "reservations",
      header: "Reservations",
      className: "text-center",
      render: (c) => {
        const count = c.reservations || 0;
        return (
          <div className="flex flex-col items-center justify-center">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
              count > 0
                ? "bg-accent/10 text-accent-foreground border border-accent/30"
                : "bg-muted text-muted-foreground border border-border"
            }`}>
              <Calendar size={12} className={count > 0 ? "text-accent" : "text-muted-foreground"} />
              {count} {count === 1 ? "booking" : "bookings"}
            </span>
          </div>
        );
      },
    },
    {
      key: "spending",
      header: "Lifetime Spend",
      render: (c) => {
        const amount = Number(c.spending || 0);
        return (
          <div className="flex flex-col">
            <span className={`text-sm font-bold ${amount > 50000 ? "text-accent-foreground" : "text-foreground"}`}>
              {fmt(amount)}
            </span>
            {amount > 0 && (
              <span className="text-[10px] text-gray-400 font-medium">Approved payments</span>
            )}
          </div>
        );
      },
    },
    {
      key: "last_booking",
      header: "Last Event",
      render: (c) => (
        <div className="text-xs">
          {c.last_booking_date ? (
            <span className="font-medium text-gray-800">{formatDate(c.last_booking_date)}</span>
          ) : (
            <span className="text-gray-400 italic">No bookings yet</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Account Status",
      render: (c) => {
        const isActive = c.is_active !== false;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isActive 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
              : "bg-gray-100 text-gray-500 border border-gray-200"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
            {isActive ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (c) => (
        <RowActionsMenu
          actions={[
            { 
              key: "view", 
              label: "View profile details", 
              icon: Eye, 
              onSelect: () => setDrawerRow(c) 
            },
            { 
              key: "reservations", 
              label: "View reservations", 
              icon: Calendar, 
              onSelect: () => navigate(`/admin/bookings/reservations?search=${encodeURIComponent(c.full_name || "")}`) 
            },
            { 
              key: "book", 
              label: "Create booking", 
              icon: Plus, 
              onSelect: () => navigate(`/admin/bookings/wizard?customer_id=${c._id}`) 
            },
            {
              key: "email",
              label: "Email customer",
              icon: Mail,
              show: !!c.email,
              onSelect: () => { window.location.href = `mailto:${c.email}`; },
            },
            {
              key: "toggle_status",
              label: c.is_active !== false ? "Deactivate account" : "Activate account",
              icon: c.is_active !== false ? XCircle : CheckCircle2,
              onSelect: () => handleToggleStatus(c),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        {/* Header Title & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Customer Directory
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage client profiles, event reservation activity, and lifetime spending.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Btn
              variant="secondary"
              size="sm"
              onClick={() => fetchCustomers(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin text-primary" : ""} />
              Refresh
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/bookings/wizard")}
              className="flex items-center gap-1.5"
            >
              <Plus size={13} /> New Booking
            </Btn>
          </div>
        </div>

        {/* Metrics Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KPICard title="Total Customers" value={metrics.total} sub="Registered client accounts" icon={Users} />
          <KPICard title="Active Bookers" value={metrics.bookerCount} sub={metrics.total > 0 ? `${Math.round((metrics.bookerCount / metrics.total) * 100)}% of total clients` : "0%"} icon={CalendarCheck} />
          <KPICard title="Total Revenue" value={fmt(metrics.totalRevenue)} sub="Cumulative approved spend" icon={TrendingUp} />
          <KPICard title="Avg Spend / Booker" value={fmt(metrics.avgSpend)} sub="Average client lifetime value" icon={Award} />
        </div>

        {/* Toolbar & Filters Card */}
        <AdminCard className="!p-3.5 sm:!p-4">

          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search customers by name, email, or phone..."
            quickFilters={quickFilters}
            activeQuickFilter={activityFilter}
            onQuickFilterChange={setActivityFilter}
            right={
              <FilterPopover
                label="Filters"
                activeCount={activeAdvancedCount}
                onApply={() => {
                  setMinSpend(draftMinSpend);
                  setMaxSpend(draftMaxSpend);
                  setMinReservations(draftMinReservations);
                  setStatusFilter(draftStatusFilter);
                }}
                onClear={() => {
                  setDraftMinSpend("");
                  setMinSpend("");
                  setDraftMaxSpend("");
                  setMaxSpend("");
                  setDraftMinReservations("");
                  setMinReservations("");
                  setDraftStatusFilter("all");
                  setStatusFilter("all");
                }}
              >
                <div className="space-y-3 min-w-[220px]">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Account Status</label>
                    <select
                      value={draftStatusFilter}
                      onChange={(e) => setDraftStatusFilter(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Min Spend (₱)</label>
                    <input
                      type="number"
                      min="0"
                      value={draftMinSpend}
                      onChange={(e) => setDraftMinSpend(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Max Spend (₱)</label>
                    <input
                      type="number"
                      min="0"
                      value={draftMaxSpend}
                      onChange={(e) => setDraftMaxSpend(e.target.value)}
                      placeholder="e.g. 200000"
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Min Reservations</label>
                    <input
                      type="number"
                      min="0"
                      value={draftMinReservations}
                      onChange={(e) => setDraftMinReservations(e.target.value)}
                      placeholder="e.g. 2"
                      className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </FilterPopover>
            }
          />

          {/* Active Filter Chips */}
          {activeAdvancedCount > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-400 font-medium">Active Filters:</span>
              {statusFilter !== "all" && (
                <FilterChip
                  label={`Status: ${statusFilter === "active" ? "Active Accounts" : "Inactive Accounts"}`}
                  onRemove={() => { setStatusFilter("all"); setDraftStatusFilter("all"); }}
                />
              )}
              {minSpend && (
                <FilterChip
                  label={`Min spend: ${fmt(minSpend)}`}
                  onRemove={() => { setMinSpend(""); setDraftMinSpend(""); }}
                />
              )}
              {maxSpend && (
                <FilterChip
                  label={`Max spend: ${fmt(maxSpend)}`}
                  onRemove={() => { setMaxSpend(""); setDraftMaxSpend(""); }}
                />
              )}
              {minReservations && (
                <FilterChip
                  label={`Min reservations: ${minReservations}`}
                  onRemove={() => { setMinReservations(""); setDraftMinReservations(""); }}
                />
              )}
            </div>
          )}
        </AdminCard>

        {/* Data Table Card */}
        <AdminCard className="!p-0 overflow-hidden shadow-sm">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(c) => c._id}
            loading={loading}
            emptyTitle="No customers found"
            emptyHint={
              search || activityFilter !== "all" || activeAdvancedCount > 0
                ? "Try adjusting your search query or clear active filters."
                : "No customer records have been created yet."
            }
            onRowClick={(c) => setDrawerRow(c)}
            minWidth="900px"
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            shownCount={pageRows.length}
            onPageChange={setPage}
          />
        </AdminCard>

        {/* =========================================================================
            SLIDE-OVER CUSTOMER DETAILS DRAWER
            ========================================================================= */}
        {drawerRow && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-drawer-title"
          >
            {/* Backdrop Scrim */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in-0 duration-200"
              onClick={() => setDrawerRow(null)}
              aria-hidden="true"
            />

            {/* Slide-Over Panel */}
            <div className="relative w-full max-w-[460px] h-full bg-card border-l border-border/80 shadow-2xl flex flex-col z-10 text-xs animate-in slide-in-from-right duration-200">
              
              {/* Pinned Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/95 backdrop-blur-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 id="customer-drawer-title" className="font-bold text-sm text-foreground truncate">
                    Customer Profile
                  </h3>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0">
                    CUST-{drawerRow._id ? drawerRow._id.slice(-6).toUpperCase() : "RECORD"}
                  </span>
                </div>
                <button
                  onClick={() => setDrawerRow(null)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Close details panel"
                  aria-label="Close details panel"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Drawer Body: Compact Customer-Focused View */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                
                {/* 1. Essential Customer Identity & Direct Contact Hero Card */}
                <div className="p-3.5 bg-muted/40 rounded-xl border border-border/70 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/35 text-accent-foreground flex items-center justify-center text-sm font-extrabold font-mono shrink-0 shadow-2xs">
                        {(drawerRow.full_name || "?")
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="font-bold text-foreground text-base tracking-tight truncate">
                          {drawerRow.full_name || "Unnamed Customer"}
                        </h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Clock size={11} className="shrink-0 text-muted-foreground/70" />
                          <span>Client since {formatDate(drawerRow.createdAt)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status & Tier Badges */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {drawerRow.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle size={11} /> Disabled
                        </span>
                      )}

                      {drawerRow.tier === "VIP" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          <Award size={11} className="text-amber-600" /> VIP Client
                        </span>
                      )}
                      {drawerRow.tier === "New" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Prospect
                        </span>
                      )}
                      {drawerRow.tier === "Regular" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                          Regular
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Contact Bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-border/50 text-xs">
                    {/* Phone Contact */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/60">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Phone size={13} className="shrink-0 text-primary" />
                        {drawerRow.phone ? (
                          <a
                            href={`tel:${drawerRow.phone}`}
                            className="font-mono text-xs font-semibold text-foreground hover:underline truncate"
                            title="Call customer"
                          >
                            {drawerRow.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">No phone</span>
                        )}
                      </div>
                      {drawerRow.phone && (
                        <button
                          type="button"
                          onClick={() => handleCopy(drawerRow.phone, "Phone")}
                          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer shrink-0"
                          title="Copy phone number"
                        >
                          {copiedKey === "Phone" ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Email Contact */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/60">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail size={13} className="shrink-0 text-primary" />
                        {drawerRow.email ? (
                          <a
                            href={`mailto:${drawerRow.email}`}
                            className="text-xs font-semibold text-foreground hover:underline truncate"
                            title="Email customer"
                          >
                            {drawerRow.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">No email</span>
                        )}
                      </div>
                      {drawerRow.email && (
                        <button
                          type="button"
                          onClick={() => handleCopy(drawerRow.email, "Email")}
                          className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer shrink-0"
                          title="Copy email address"
                        >
                          {copiedKey === "Email" ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Contextual Action Required / Status Alert */}
                {drawerRow.is_active === false && (
                  <div className="p-3 bg-rose-50/90 border border-rose-300/80 rounded-xl text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-rose-900">
                        <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                        <span>Account Inactive / Disabled</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(drawerRow)}
                        className="px-2 py-0.5 rounded text-[11px] font-bold bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs shrink-0"
                      >
                        Reactivate Account
                      </button>
                    </div>
                    <p className="text-rose-800 text-[11px] pl-5 leading-relaxed">
                      This customer account is currently deactivated and cannot place reservations or sign in to the portal.
                    </p>
                  </div>
                )}

                {drawerRow.tier === "VIP" && drawerRow.is_active !== false && (
                  <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-xl text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <Sparkles size={14} className="text-amber-600 shrink-0" />
                      <span>Premier VIP Customer</span>
                    </div>
                    <p className="text-amber-800 text-[11px] pl-5 leading-relaxed">
                      High lifetime spend client ({fmt(drawerRow.spending)}). Prioritize custom package concessions and expedited booking review.
                    </p>
                  </div>
                )}

                {/* 3. Business Engagement & Value Overview */}
                <div className="p-3.5 bg-card border border-border/70 rounded-xl space-y-2.5 shadow-2xs">
                  <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp size={12} className="text-primary" /> Engagement &amp; Value Overview
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {drawerRow.reservations ?? 0} total bookings
                    </span>
                  </h5>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {/* Metric 1: Lifetime Spend */}
                    <div className="p-2.5 bg-muted/40 rounded-lg border border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Lifetime Spend
                      </span>
                      <span className="font-mono font-bold text-sm text-foreground block mt-0.5 truncate" title={fmt(drawerRow.spending)}>
                        {fmt(drawerRow.spending)}
                      </span>
                    </div>

                    {/* Metric 2: Total Reservations */}
                    <div className="p-2.5 bg-muted/40 rounded-lg border border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Reservations
                      </span>
                      <span className="font-mono font-bold text-sm text-foreground block mt-0.5">
                        {drawerRow.reservations ?? 0}
                      </span>
                    </div>

                    {/* Metric 3: Last Event Date */}
                    <div className="p-2.5 bg-muted/40 rounded-lg border border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Last Event
                      </span>
                      <span className="text-xs font-semibold text-foreground block mt-1 truncate" title={formatDate(drawerRow.last_booking_date)}>
                        {formatDate(drawerRow.last_booking_date)}
                      </span>
                    </div>

                    {/* Metric 4: Customer Rating */}
                    <div className="p-2.5 bg-muted/40 rounded-lg border border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Rating
                      </span>
                      <div className="mt-1">
                        {drawerRow.rating ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                            <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />
                            <span>{drawerRow.rating}.0</span>
                            <span className="text-[10px] text-muted-foreground font-normal">/ 5</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">No review</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Booking & Event Relationship */}
                <div className="bg-card border border-border/70 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calendar size={12} className="text-primary" /> Associated Bookings &amp; Events
                    </h5>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {customerBookings.length} {customerBookings.length === 1 ? "event" : "events"}
                    </span>
                  </div>

                  {customerBookings.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                      {customerBookings.slice(0, 5).map((b) => (
                        <div
                          key={b._id}
                          onClick={() => navigate(`/admin/bookings/${b.reference || b._id}/details`)}
                          className="p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 transition-all flex items-center justify-between gap-2 cursor-pointer group"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                                {b.reference || `BK-${b._id.slice(-6).toUpperCase()}`}
                              </span>
                              {b.event_type && (
                                <span className="text-[9.5px] font-medium text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                                  {b.event_type}
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-muted-foreground flex items-center gap-1.5">
                              <span>{formatDate(b.event_date)}</span>
                              {b.guest_count && (
                                <>
                                  <span>•</span>
                                  <span>{b.guest_count} guests</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 space-y-0.5 flex flex-col items-end">
                            <div className="font-mono font-bold text-xs text-foreground">
                              {fmt(b.total_amount || b.pricing?.grand_total || b.total_price || 0)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge status={b.status} />
                              <ExternalLink size={10} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                            </div>
                          </div>
                        </div>
                      ))}
                      {customerBookings.length > 5 && (
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/bookings/reservations?search=${encodeURIComponent(drawerRow.full_name || "")}`)}
                          className="w-full py-1 text-center text-[11px] text-primary hover:underline font-medium cursor-pointer"
                        >
                          View all {customerBookings.length} bookings →
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-muted/20 border border-border/50 text-center space-y-2">
                      <p className="text-muted-foreground text-xs">
                        No booking records found for this customer profile.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/bookings/wizard?customer_id=${drawerRow._id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        <Plus size={12} /> Create First Reservation
                      </button>
                    </div>
                  )}
                </div>

                {/* 5. Account Specifications (Subordinate Technical Details) */}
                <div className="bg-card border border-border/70 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                  <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-primary" /> Account &amp; System Details
                  </h5>
                  <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Customer ID</span>
                      <span className="font-mono font-bold text-foreground truncate block" title={drawerRow._id}>
                        {drawerRow._id}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Registered Date</span>
                      <span className="font-semibold text-foreground block">
                        {formatDate(drawerRow.createdAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Account Access</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`font-semibold ${drawerRow.is_active !== false ? "text-emerald-600" : "text-rose-600"}`}>
                          {drawerRow.is_active !== false ? "Active & Authorized" : "Disabled / Locked"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Role Category</span>
                      <span className="font-semibold text-foreground block capitalize">
                        Customer ({drawerRow.tier || "Standard"})
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Pinned Drawer Footer: Refined Action Hierarchy */}
              <div className="p-3.5 border-t border-border bg-card/95 backdrop-blur-xs space-y-2 shrink-0">
                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => navigate(`/admin/bookings/wizard?customer_id=${drawerRow._id}`)}
                  className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  title="Create a new booking for this customer"
                >
                  <Plus size={14} />
                  <span>Create New Booking</span>
                </button>

                {/* Secondary Actions Row */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/bookings/reservations?search=${encodeURIComponent(drawerRow.full_name || "")}`)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg border border-border/80 bg-card font-semibold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                    title="View customer reservations in table"
                  >
                    <Calendar size={13} className="text-muted-foreground" />
                    <span>View Reservations</span>
                  </button>

                  {drawerRow.email ? (
                    <a
                      href={`mailto:${drawerRow.email}`}
                      className="flex-1 py-1.5 px-2.5 rounded-lg border border-border/80 bg-card font-semibold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                      title="Send an email to customer"
                    >
                      <Mail size={13} className="text-muted-foreground" />
                      <span>Email Client</span>
                    </a>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleToggleStatus(drawerRow)}
                    className={`py-1.5 px-2.5 rounded-lg border font-semibold transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs ${
                      drawerRow.is_active !== false
                        ? "border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100"
                        : "border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-100"
                    }`}
                    title={drawerRow.is_active !== false ? "Deactivate customer account" : "Activate customer account"}
                  >
                    {drawerRow.is_active !== false ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                    <span>{drawerRow.is_active !== false ? "Deactivate" : "Activate"}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

