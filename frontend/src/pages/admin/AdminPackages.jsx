import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  MoreHorizontal,
  Filter,
  X,
  ChevronDown,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import { AdminAPI } from "../../api/admin";
import { useNavigate } from "react-router-dom";
import useToast from "../../hooks/useToast";
import PackageModal from "../../components/admin/ui/PackageModal";
import ConfirmDialog from "../../components/common/ConfirmDialog";

// Constants
const EVENT_TYPES = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Christening",
  "Anniversary",
  "Other",
];
const PACKAGE_TYPES = ["Food Only", "Event Setup Only", "Food + Event Setup"];

export default function AdminPackages() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState("standard");
  const [search, setSearch] = useState("");

  // Filter states
  const [filters, setFilters] = useState({
    event_type: "",
    package_type: "",
    available: "", // "true", "false", or ""
  });
  const [showFilters, setShowFilters] = useState(false);

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [quotes, setQuotes] = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [activePkg, setActivePkg] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadData = () => {
    setLoading(true);
    AdminAPI.getPackages()
      .then((res) => setPackages(res.data))
      .catch((err) => notify("Failed to load packages", "error"))
      .finally(() => setLoading(false));
  };

  const loadQuotes = () => {
    setQuotesLoading(true);
    AdminAPI.getQuotes()
      .then((res) => setQuotes(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify("Failed to load custom quotes", "error"))
      .finally(() => setQuotesLoading(false));
  };

  useEffect(() => {
    loadData();
    loadQuotes();
  }, []);

  const pendingQuotes = quotes.filter((q) => q.status !== "converted");
  const convertedQuotes = quotes.filter((q) => q.status === "converted");

  const handleOpenModal = (pkg = null) => {
    setActivePkg(pkg);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActivePkg(null);
  };

  const handleDelete = (id) => {
    AdminAPI.deletePackage(id)
      .then(() => {
        notify("Package deleted successfully", "success");
        setCancelTarget(null);
        loadData();
      })
      .catch((err) =>
        notify(
          err.response?.data?.message || "Failed to delete package",
          "error",
        ),
      );
  };

  const clearFilters = () => {
    setFilters({ event_type: "", package_type: "", available: "" });
  };

  const hasActiveFilters =
    filters.event_type || filters.package_type || filters.available;

  // Filter packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      // Search filter
      if (search && !pkg.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Event type filter
      if (filters.event_type && pkg.event_type !== filters.event_type) {
        return false;
      }
      // Package type filter
      if (filters.package_type && pkg.package_type !== filters.package_type) {
        return false;
      }
      // Availability filter
      if (filters.available === "true" && !pkg.available) {
        return false;
      }
      if (filters.available === "false" && pkg.available) {
        return false;
      }
      return true;
    });
  }, [packages, search, filters]);

  const fmt = (n) =>
    "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-[#F9FAFB] min-h-screen">
        {/* ============ HEADER ============ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2
              style={{ fontFamily: "Playfair Display, serif" }}
              className="text-2xl font-bold text-[#111]"
            >
              Service Management
            </h2>
            <p className="text-sm text-[#6B7280] mt-1">
              Manage your packages and custom quote requests
            </p>
          </div>
          <Btn variant="gold" size="sm" onClick={() => handleOpenModal()}>
            <Plus size={13} /> New Package
          </Btn>
        </div>

        {/* ============ TABS ============ */}
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setTab("standard")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors rounded-t-lg ${
              tab === "standard"
                ? "border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            Standard Packages
            <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {packages.length}
            </span>
          </button>
          <button
            onClick={() => setTab("custom")}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors rounded-t-lg ${
              tab === "custom"
                ? "border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            Custom Quote Reviews
          </button>
        </div>

        {/* ============ STANDARD PACKAGES TAB ============ */}
        {tab === "standard" ? (
          <div className="space-y-4">
            {/* Search & Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-md">
                <Search size={14} className="text-[#9CA3AF] flex-shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search packages by name..."
                  className="bg-transparent text-sm focus:outline-none flex-1"
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filter Toggle Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                  hasActiveFilters || showFilters
                    ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Filter size={14} />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-[#D4AF37] rounded-full" />
                )}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
                />
              </button>

              {/* Active Filter Count */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:text-red-600 font-medium"
                >
                  <X size={14} />
                  Clear filters
                </button>
              )}
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Event Type Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    Event Type
                  </label>
                  <select
                    value={filters.event_type}
                    onChange={(e) =>
                      setFilters({ ...filters, event_type: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] bg-white"
                  >
                    <option value="">All Event Types</option>
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Package Type Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    Package Type
                  </label>
                  <select
                    value={filters.package_type}
                    onChange={(e) =>
                      setFilters({ ...filters, package_type: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] bg-white"
                  >
                    <option value="">All Package Types</option>
                    {PACKAGE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Availability Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    Availability
                  </label>
                  <select
                    value={filters.available}
                    onChange={(e) =>
                      setFilters({ ...filters, available: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] bg-white"
                  >
                    <option value="">All Status</option>
                    <option value="true">Available</option>
                    <option value="false">Unavailable</option>
                  </select>
                </div>
              </div>
            )}

            {/* Results Summary */}
            {!loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>
                  Showing{" "}
                  <strong className="text-[#111]">
                    {filteredPackages.length}
                  </strong>{" "}
                  of <strong className="text-[#111]">{packages.length}</strong>{" "}
                  packages
                </span>
                {hasActiveFilters && (
                  <span className="text-xs bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded-full">
                    Filtered
                  </span>
                )}
              </div>
            )}

            {/* Packages Grid */}
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-gray-500">Loading packages...</p>
              </div>
            ) : filteredPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPackages.map((pkg) => (
                  <AdminCard
                    key={pkg._id}
                    className="!p-5 hover:shadow-md transition-all duration-200 hover:border-[#D4AF37]/30 group"
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[#111] truncate">
                          {pkg.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-[#6B7280] font-mono">
                            #
                            {pkg._id
                              .substring(pkg._id.length - 6)
                              .toUpperCase()}
                          </p>
                          {pkg.event_type && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {pkg.event_type}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        status={pkg.available ? "available" : "unavailable"}
                      />
                    </div>

                    {/* Package Image */}
                    {pkg.image_url && (
                      <div className="w-full h-36 mb-3 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={pkg.image_url}
                          alt={pkg.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    {/* Package Type Badge */}
                    <div className="mb-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          pkg.package_type === "Food Only"
                            ? "bg-orange-50 text-orange-600"
                            : pkg.package_type === "Event Setup Only"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-purple-50 text-purple-600"
                        }`}
                      >
                        {pkg.package_type}
                      </span>
                    </div>

                    {/* Pricing */}
                    <div className="mb-3">
                      {pkg.package_type === "Food Only" ? (
                        <p className="text-lg font-bold text-[#D4AF37]">
                          Menu-based pricing
                        </p>
                      ) : pkg.package_type === "Event Setup Only" ? (
                        <div>
                          <p className="text-lg font-bold text-[#D4AF37]">
                            {pkg.scaffold_size_options?.length > 0
                              ? `${pkg.scaffold_size_options.length} scaffold options`
                              : "No pricing set"}
                          </p>
                          {pkg.scaffold_size_options?.length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              From{" "}
                              {fmt(
                                Math.min(
                                  ...pkg.scaffold_size_options.map(
                                    (o) => o.price || 0,
                                  ),
                                ),
                              )}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-lg font-bold text-[#D4AF37]">
                          {fmt(pkg.price_per_guest)}
                          <span className="text-xs text-gray-500 font-normal">
                            /pax
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Inclusions */}
                    <div>
                      <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">
                        Inclusions
                      </p>
                      <ul className="space-y-1 mb-4 h-24 overflow-y-auto">
                        {(pkg.inclusions || []).slice(0, 4).map((inc, i) => (
                          <li
                            key={i}
                            className="text-sm text-[#374151] flex items-center gap-2 truncate"
                            title={inc}
                          >
                            <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full flex-shrink-0" />
                            <span className="truncate">{inc}</span>
                          </li>
                        ))}
                        {(pkg.inclusions || []).length > 4 && (
                          <li className="text-xs text-gray-400 italic">
                            +{pkg.inclusions.length - 4} more items
                          </li>
                        )}
                        {(pkg.inclusions || []).length === 0 && (
                          <li className="text-sm text-gray-400 italic">
                            No inclusions specified
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Card Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <Btn
                        variant="secondary"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => handleOpenModal(pkg)}
                      >
                        <Edit3 size={13} /> Edit
                      </Btn>
                      <Btn
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setCancelTarget(pkg)}
                      >
                        <Trash2 size={13} />
                      </Btn>
                    </div>
                  </AdminCard>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-[#111] mb-1">
                  No packages found
                </h3>
                <p className="text-sm text-gray-500">
                  {hasActiveFilters
                    ? "Try adjusting your filters or search criteria"
                    : "Create your first package to get started"}
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ============ CUSTOM QUOTES TAB ============ */
          <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
            {quotesLoading ? (
              <div className="w-full text-center py-16 text-gray-500">Loading custom quotes...</div>
            ) : (
              [
                { column: "Pending Review", items: pendingQuotes },
                { column: "Converted", items: convertedQuotes },
              ].map(({ column, items }) => (
                <div
                  key={column}
                  className="flex-shrink-0 w-80 bg-gray-50 rounded-2xl p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-[#111] text-sm">{column}</h3>
                    <span className="text-xs font-bold bg-white text-[#6B7280] px-2 py-0.5 rounded-full border border-gray-200">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <AdminCard
                        key={item._id}
                        className="!p-4 cursor-pointer hover:border-[#D4AF37] transition-colors shadow-sm"
                        onClick={() => navigate(`/admin/quotes/${item._id}/details`)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-mono font-bold text-[#D4AF37]">
                            {item._id.slice(-6).toUpperCase()}
                          </span>
                          <MoreHorizontal size={14} className="text-[#9CA3AF]" />
                        </div>
                        <p className="font-bold text-[#111] text-sm">
                          {item.full_name || item.customer_id?.full_name || "Unknown"}
                        </p>
                        <p className="text-xs text-[#6B7280] mb-3">
                          {item.event_date ? new Date(item.event_date).toLocaleDateString() : "No date"} · {item.guest_count || "—"} pax
                        </p>

                        <div className="bg-gray-50 rounded-lg p-2 mb-3 border border-gray-100">
                          <p className="text-xs text-[#374151]">
                            <strong>Event:</strong> {item.event_type || "—"}
                          </p>
                          {item.notes && (
                            <p className="text-[11px] text-[#6B7280] mt-1 italic">
                              "{item.notes}"
                            </p>
                          )}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <span className="font-bold text-[#111] text-sm">
                            {item.budget_range || "—"}
                          </span>
                          <span className="text-xs text-[#D4AF37] font-semibold">View Details →</span>
                        </div>
                      </AdminCard>
                    ))}
                    {items.length === 0 && (
                      <div className="p-4 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-xs font-medium">
                        No custom quotes
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ============ MODALS ============ */}
      {showModal && (
        <PackageModal
          pkg={activePkg}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadData();
          }}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          title="Delete Package"
          message={`Are you sure you want to delete the package "${cancelTarget.name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(cancelTarget._id)}
          onCancel={() => setCancelTarget(null)}
          confirmText="Delete"
          confirmVariant="danger"
        />
      )}
    </AdminLayout>
  );
}
