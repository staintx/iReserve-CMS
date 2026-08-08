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
  ExternalLink 
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
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
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import DrawerField from "../../components/admin/table/DrawerField";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";

export default function AdminCustomers() {
  const { notify } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerRow, setDrawerRow] = useState(null);

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
      const res = await AdminAPI.getCustomers();
      setCustomers(Array.isArray(res.data) ? res.data : []);
      if (isManualRefresh) {
        notify("Customer list updated", "success");
      }
    } catch (err) {
      notify("Failed to load customers", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

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
    } catch (err) {
      notify(`Failed to ${actionText} customer account`, "error");
    }
  };

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
      <div className="p-6 space-y-6 bg-background min-h-screen">
        {/* Header Title & Top Actions */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-gray-900">
              Customer Management
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Manage client profiles, event reservation activity, lifetime spending, and account access.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Btn
              variant="secondary"
              size="sm"
              onClick={() => fetchCustomers(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin text-primary" : ""} />
              Refresh
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              onClick={() => navigate("/admin/bookings/wizard")}
              className="flex items-center gap-1.5"
            >
              <Plus size={14} /> New Booking
            </Btn>
          </div>
        </div>

        {/* Metrics Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminCard className="!p-4 border-l-4 border-l-accent">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Customers</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{metrics.total}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent-foreground flex items-center justify-center">
                <Users size={20} />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Registered client accounts</p>
          </AdminCard>

          <AdminCard className="!p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Bookers</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{metrics.bookerCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CalendarCheck size={20} />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              {metrics.total > 0 ? `${Math.round((metrics.bookerCount / metrics.total) * 100)}% of total clients` : "0%"}
            </p>
          </AdminCard>

          <AdminCard className="!p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{fmt(metrics.totalRevenue)}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Cumulative approved spend</p>
          </AdminCard>

          <AdminCard className="!p-4 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Spend / Booker</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{fmt(metrics.avgSpend)}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Award size={20} />
              </div>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Average client lifetime value</p>
          </AdminCard>
        </div>

        {/* Toolbar & Filters Card */}
        <AdminCard className="!p-4">
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

        {/* Detail Profile Drawer */}
        <DetailDrawer
          open={!!drawerRow}
          onOpenChange={(open) => !open && setDrawerRow(null)}
          title={drawerRow?.full_name || "Customer Profile"}
          description={drawerRow?.email || "Client Information & History"}
          footer={
            drawerRow && (
              <div className="flex items-center justify-end gap-2 w-full flex-wrap">
                {drawerRow.email && (
                  <Btn
                    variant="secondary"
                    size="sm"
                    onClick={() => { window.location.href = `mailto:${drawerRow.email}`; }}
                    className="flex items-center gap-1.5"
                  >
                    <Mail size={13} /> Email Customer
                  </Btn>
                )}
                <Btn
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/admin/bookings/reservations?search=${encodeURIComponent(drawerRow.full_name || "")}`)}
                  className="flex items-center gap-1.5"
                >
                  <Calendar size={13} /> View Reservations
                </Btn>
                <Btn
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/admin/bookings/wizard?customer_id=${drawerRow._id}`)}
                  className="flex items-center gap-1.5"
                >
                  <Plus size={13} /> New Booking
                </Btn>
              </div>
            )
          }
        >
          {drawerRow && (
            <div className="space-y-5">
              {/* Profile Card Header */}
              <div className="bg-gradient-to-r from-amber-50/60 to-orange-50/30 border border-amber-100 rounded-xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent/30 to-accent/50 border-2 border-accent/50 flex items-center justify-center text-lg font-bold text-accent-foreground shrink-0 shadow-sm">
                  {(drawerRow.full_name || "?")
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 style={{ fontFamily: "Playfair Display, serif" }} className="text-lg font-bold text-gray-900 truncate">
                      {drawerRow.full_name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      drawerRow.is_active !== false
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-200 text-gray-700"
                    }`}>
                      {drawerRow.is_active !== false ? "Active Account" : "Inactive Account"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Member since {formatDate(drawerRow.createdAt)}
                  </p>
                </div>
              </div>

              {/* Mini Stats Grid inside Drawer */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <span className="text-[11px] font-medium text-gray-400 block">Lifetime Spend</span>
                  <span className="text-base font-bold text-accent-foreground mt-0.5 block">{fmt(drawerRow.spending)}</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <span className="text-[11px] font-medium text-gray-400 block">Total Reservations</span>
                  <span className="text-base font-bold text-gray-900 mt-0.5 block">{drawerRow.reservations ?? 0}</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <span className="text-[11px] font-medium text-gray-400 block">Last Event Date</span>
                  <span className="text-xs font-semibold text-gray-800 mt-1 block">{formatDate(drawerRow.last_booking_date)}</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3">
                  <span className="text-[11px] font-medium text-gray-400 block">Customer Rating</span>
                  <div className="mt-1">
                    {drawerRow.rating ? (
                      <div className="flex items-center gap-0.5 text-xs font-bold text-gray-700">
                        {Array(5).fill(null).map((_, i) => (
                          <Star key={i} size={12} className={i < drawerRow.rating ? "text-accent fill-accent" : "text-gray-200 fill-gray-200"} />
                        ))}
                        <span className="ml-1 text-gray-600">({drawerRow.rating})</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No ratings yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Fields */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
                  Contact & Account Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <DrawerField label="Email Address" value={drawerRow.email || "—"} />
                  <DrawerField label="Phone Number" value={drawerRow.phone || "—"} />
                  <DrawerField label="Registration Date" value={formatDate(drawerRow.createdAt)} />
                  <DrawerField
                    label="Account Access"
                    value={
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-700 font-medium">
                          {drawerRow.is_active !== false ? "Active" : "Disabled"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(drawerRow)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          ({drawerRow.is_active !== false ? "Deactivate" : "Activate"})
                        </button>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </DetailDrawer>
      </div>
    </AdminLayout>
  );
}

