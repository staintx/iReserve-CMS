import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Edit3,
  Trash2,
  Check,
  XCircle,
  Tag,
  Sparkles,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package as PackageIcon,
  Calendar,
  ExternalLink,
  Layers,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import ItemDeleteWarningModal from "../../components/admin/common/ItemDeleteWarningModal";
import FilterPill from "../../components/admin/table/FilterPill";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import usePagination from "../../hooks/usePagination";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import AddonModal from "../../components/admin/ui/AddonModal";
import AIAddonParserModal from "../../components/admin/ui/AIAddonParserModal";

const escapeRegex = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export default function AdminAddons() {
  const { notify } = useToast();
  const [addons, setAddons] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");

  // Modal & Drawer states
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [activeAddon, setActiveAddon] = useState(null);
  const [drawerRow, setDrawerRow] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [addonsRes, pkgsRes] = await Promise.all([
        AdminAPI.getAddons(),
        AdminAPI.getPackages().catch(() => ({ data: [] })),
      ]);
      setAddons(Array.isArray(addonsRes.data) ? addonsRes.data : []);
      setPackages(Array.isArray(pkgsRes.data) ? pkgsRes.data : []);
    } catch {
      notify("Failed to load addons", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealTimeRefresh(loadData, ["addon"]);

  // Keep drawerRow synchronized when addons data updates
  useEffect(() => {
    if (!drawerRow) return;
    const fresh = addons.find((a) => a._id === drawerRow._id);
    if (fresh) {
      setDrawerRow(fresh);
    }
  }, [addons]);

  const handleOpenModal = (addon = null) => {
    setActiveAddon(addon);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveAddon(null);
  };

  const handleToggleStatus = async (addon) => {
    const nextStatus = addon.available === false;
    setAddons((prev) =>
      prev.map((a) => (a._id === addon._id ? { ...a, available: nextStatus } : a))
    );

    if (drawerRow && drawerRow._id === addon._id) {
      setDrawerRow((prev) => (prev ? { ...prev, available: nextStatus } : prev));
    }

    try {
      await AdminAPI.updateAddon(addon._id, { available: nextStatus });
      notify(`"${addon.name}" is now ${nextStatus ? "Available" : "Unavailable"}`, "success");
    } catch {
      notify("Failed to update status", "error");
      loadData();
    }
  };

  const handleDelete = async (id) => {
    try {
      await AdminAPI.deleteAddon(id);
      notify("Addon deleted successfully", "success");
      setCancelTarget(null);
      setDrawerRow(null);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to delete addon", "error");
    }
  };

  // Cross-reference packages that offer or include this addon
  const getAssociatedPackages = (addonItem) => {
    if (!addonItem || !packages.length) return [];
    const addonName = addonItem.name ? addonItem.name.trim().toLowerCase() : "";
    if (!addonName) return [];

    return packages.filter((pkg) => {
      if (Array.isArray(pkg.inclusions)) {
        return pkg.inclusions.some((inc) => {
          const incStr = (typeof inc === "object" ? inc?.name || "" : String(inc)).toLowerCase();
          return incStr.includes(addonName) || addonName.includes(incStr);
        });
      }
      return false;
    });
  };

  // Filter addons based on search and availability
  const filtered = useMemo(() => {
    return addons.filter((a) => {
      const matchSearch =
        !search ||
        (a.name && a.name.toLowerCase().includes(search.toLowerCase())) ||
        (a.description && a.description.toLowerCase().includes(search.toLowerCase()));

      const isAvailable = a.available !== false && a.status !== "unavailable" && a.status !== "inactive";
      const matchAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" ? isAvailable : !isAvailable);

      return matchSearch && matchAvailability;
    });
  }, [addons, search, availabilityFilter]);

  const { pageRows, page, setPage, totalPages, pageSize } = usePagination(filtered, 10);

  const availabilityCounts = useMemo(() => {
    let availableCount = 0;
    let unavailableCount = 0;
    addons.forEach((a) => {
      const isAvail = a.available !== false && a.status !== "unavailable" && a.status !== "inactive";
      if (isAvail) availableCount++;
      else unavailableCount++;
    });
    return { all: addons.length, available: availableCount, unavailable: unavailableCount };
  }, [addons]);

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        {/* ============ HEADER ============ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Global Addons</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage extra rentals, service upgrades, and equipment available for custom quotes &amp; bookings
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setShowAIModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-primary bg-powder border border-primary/20 shadow-2xs hover:bg-powder/80 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles size={13} className="text-primary" />
              <span>Import with Zelle AI</span>
            </button>
            <Btn variant="primary" size="sm" onClick={() => handleOpenModal()}>
              <Plus size={13} /> Add Addon
            </Btn>
          </div>
        </div>

        {/* ============ TOOLBAR ============ */}
        <AdminCard className="!p-3 sm:!p-3.5 border border-gray-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="relative w-full">
                <div className="flex items-center gap-2 bg-gray-50/70 border border-gray-200 rounded-lg px-3 h-9 text-sm focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10 focus-within:bg-white transition-all shadow-2xs">
                  <Search size={14} className="text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search add-on name or description..."
                    className="w-full bg-transparent text-xs sm:text-sm text-foreground focus:outline-none placeholder:text-gray-400"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filter Pill */}
            <div className="flex items-center gap-2 shrink-0">
              <FilterPill
                label="Availability"
                value={availabilityFilter}
                defaultValue="all"
                options={[
                  { value: "all", label: "All Addons", count: availabilityCounts.all },
                  { value: "available", label: "Available", count: availabilityCounts.available },
                  { value: "unavailable", label: "Unavailable", count: availabilityCounts.unavailable },
                ]}
                onSelect={(val) => setAvailabilityFilter(val)}
                onClear={() => setAvailabilityFilter("all")}
              />
            </div>
          </div>
        </AdminCard>

        {/* ============ TABLE CARD ============ */}
        <AdminCard className="!p-0 overflow-hidden border border-gray-200/80 shadow-xs">
          {loading ? (
            <div className="p-12 text-center text-sm text-gray-400">Loading addons...</div>
          ) : pageRows.length === 0 ? (
            <div className="p-12 text-center space-y-1">
              <p className="text-sm font-semibold text-gray-700">No addons found.</p>
              {search || availabilityFilter !== "all" ? (
                <p className="text-xs text-gray-400">Try adjusting your search or filters.</p>
              ) : (
                <p className="text-xs text-gray-400">Create your first addon or import with Zelle AI!</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-[#F8FAFC] border-b border-gray-200/80">
                  <tr>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Addon Name
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Description
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {pageRows.map((addon) => {
                    const isAvailable =
                      addon.available !== false &&
                      addon.status !== "unavailable" &&
                      addon.status !== "inactive";

                    return (
                      <tr
                        key={addon._id}
                        onClick={() => setDrawerRow(addon)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-gray-900 group-hover:text-primary transition-colors text-sm">
                            {addon.name}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[340px] truncate">
                          {addon.description || <span className="text-gray-300 italic">No description provided</span>}
                        </td>

                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(addon)}
                            title={`Click to mark ${isAvailable ? "Unavailable" : "Available"}`}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs transition-all cursor-pointer hover:opacity-85 ${
                              isAvailable
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                : "bg-rose-50 text-rose-700 border-rose-200/80"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isAvailable ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            <span>{isAvailable ? "Available" : "Unavailable"}</span>
                          </button>
                        </td>

                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            <RowActionsMenu
                              actions={[
                                {
                                  key: "view",
                                  label: "View details",
                                  icon: Eye,
                                  onSelect: () => setDrawerRow(addon),
                                },
                                {
                                  key: "edit",
                                  label: "Edit addon",
                                  icon: Edit3,
                                  onSelect: () => handleOpenModal(addon),
                                },
                                {
                                  key: "delete",
                                  label: "Delete addon",
                                  icon: Trash2,
                                  destructive: true,
                                  onSelect: () => setCancelTarget(addon),
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ============ FOOTER PAGINATION ============ */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t border-gray-100 bg-white gap-2">
            <span className="text-xs text-gray-500 font-medium">
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    className={`min-w-[26px] h-[26px] px-1.5 rounded-md text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                      n === page
                        ? "bg-primary text-white shadow-2xs"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </AdminCard>
      </div>

      {/* ============ MODALS ============ */}
      {showAIModal && (
        <AIAddonParserModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          existingAddons={addons}
          onBulkSuccess={() => {
            loadData();
          }}
        />
      )}

      {showModal && (
        <AddonModal
          addon={activeAddon}
          existingAddons={addons}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadData();
            setDrawerRow(null);
          }}
        />
      )}

      {cancelTarget && (
        <ItemDeleteWarningModal
          isOpen={!!cancelTarget}
          item={cancelTarget}
          type="addon"
          onClose={() => setCancelTarget(null)}
          onConfirm={() => handleDelete(cancelTarget._id)}
        />
      )}

      {/* ============ DETAIL DRAWER ============ */}
      {drawerRow && (
        <DetailDrawer
          open={!!drawerRow}
          onOpenChange={(open) => !open && setDrawerRow(null)}
          title={drawerRow?.name || ""}
          headerExtra={
            <Badge
              status={
                drawerRow.available !== false && drawerRow.status !== "unavailable" && drawerRow.status !== "inactive"
                  ? "available"
                  : "unavailable"
              }
              dot
            />
          }
          footer={
            <div className="flex items-center justify-between w-full gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const row = drawerRow;
                  setDrawerRow(null);
                  setCancelTarget(row);
                }}
                className="py-2 px-3.5 rounded-lg font-semibold text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 bg-rose-600 hover:bg-rose-700 text-white active:scale-[0.99]"
              >
                <Trash2 size={13} /> Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  const row = drawerRow;
                  setDrawerRow(null);
                  handleOpenModal(row);
                }}
                className="flex-1 py-2 px-4 rounded-lg font-semibold text-xs text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary-hover active:scale-[0.99]"
              >
                <Edit3 size={13} /> Edit addon
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Status Card */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Status</span>
                <span
                  className={`text-xs font-bold mt-0.5 block ${
                    drawerRow.available !== false ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {drawerRow.available !== false ? "Available for Custom Bookings" : "Unavailable (Disabled)"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleStatus(drawerRow)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Toggle Status
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Description
              </span>
              <div className="p-3 bg-white rounded-lg border border-slate-200/80 text-xs text-slate-700 leading-relaxed min-h-[60px]">
                {drawerRow.description || <span className="text-slate-400 italic">No description provided.</span>}
              </div>
            </div>

            {/* Associated Packages */}
            {(() => {
              const associated = getAssociatedPackages(drawerRow);
              return (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <h5 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <PackageIcon size={11} className="text-blue-600" /> Associated Packages ({associated.length})
                  </h5>

                  {associated.length > 0 ? (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                      {associated.map((pkg) => (
                        <div
                          key={pkg._id}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-semibold text-slate-900 truncate">{pkg.name}</p>
                            <p className="text-[10.5px] text-slate-500 mt-0.5">
                              {pkg.offer_type === "special" ? "Special Combo" : "Event Package"} · {pkg.event_type || "Catering"}
                            </p>
                          </div>
                          <Link
                            to={`/admin/packages?id=${pkg._id}&tab=${pkg.offer_type === "special" ? "special" : "regular"}`}
                            onClick={() => setDrawerRow(null)}
                            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-blue-600 hover:text-blue-700 transition-colors bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs hover:bg-slate-50 shrink-0"
                          >
                            View <ExternalLink size={10} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2.5 px-3 rounded-md bg-slate-50/40 border border-dashed border-slate-200/80 text-center">
                      <p className="text-[11px] text-slate-400 italic">
                        This addon is not currently pre-bundled in any catalog packages.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Timestamps */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Calendar size={12} className="shrink-0 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Created</p>
                  <p className="text-slate-700 font-medium text-[11px]">
                    {drawerRow.createdAt
                      ? new Date(drawerRow.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={12} className="shrink-0 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Last Updated</p>
                  <p className="text-slate-700 font-medium text-[11px]">
                    {drawerRow.updatedAt
                      ? new Date(drawerRow.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DetailDrawer>
      )}
    </AdminLayout>
  );
}
