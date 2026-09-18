import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  X,
  Globe,
  Tag,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import GalleryModal from "../../components/admin/ui/GalleryModal";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import Pagination from "../../components/admin/table/Pagination";
import GalleryDetailDrawer from "../../components/admin/gallery/GalleryDetailDrawer";

const PAGE_SIZE = 12;

export default function AdminGallery() {
  const { notify } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [drawerItem, setDrawerItem] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  // Album Categories list
  const categories = useMemo(() => {
    const base = ["Weddings", "Birthday", "Corporate Events", "Food Display"];
    const dynamic = (items || [])
      .map((i) => i?.category?.trim())
      .filter(Boolean);
    const unique = Array.from(new Set([...base, ...dynamic])).filter(Boolean);
    return ["all", ...unique];
  }, [items]);

  // Load Gallery content from backend
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await AdminAPI.getGallery();
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      notify("Failed to load gallery items", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealTimeRefresh(loadData);

  const handleOpenModal = (item = null) => {
    setActiveItem(item);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveItem(null);
  };

  const handleDelete = (id) => {
    AdminAPI.deleteGallery(id)
      .then(() => {
        notify("Photo deleted from website gallery", "success");
        setCancelTarget(null);
        if (drawerItem && drawerItem._id === id) setDrawerItem(null);
        loadData();
      })
      .catch((err) =>
        notify(err.response?.data?.message || "Failed to delete photo", "error")
      );
  };

  // Filter items based on search and album category
  const filtered = useMemo(() => {
    return items.filter((i) => {
      const matchSearch =
        !search ||
        (i.title && i.title.toLowerCase().includes(search.toLowerCase())) ||
        (i.category && i.category.toLowerCase().includes(search.toLowerCase())) ||
        (i.description && i.description.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = filter === "all" || i.category === filter;
      return matchSearch && matchCategory;
    });
  }, [items, search, filter]);

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter]);

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  // Actions menu for individual photo card
  const getRowActions = (item) => [
    {
      key: "view",
      label: "Preview Details",
      icon: Eye,
      onSelect: () => setDrawerItem(item),
    },
    {
      key: "edit",
      label: "Edit Photo Info",
      icon: Edit3,
      onSelect: () => handleOpenModal(item),
    },
    { divider: true },
    {
      key: "delete",
      label: "Delete Photo",
      icon: Trash2,
      destructive: true,
      onSelect: () => setCancelTarget(item),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen pb-10">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Website Gallery
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage portfolio photos, captions, and event albums displayed to customers on the public website.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <a
              href="/gallery"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-primary bg-powder border border-primary/20 shadow-2xs hover:bg-powder/80 transition-all cursor-pointer"
              title="Preview the live website gallery page"
            >
              <Globe size={13} className="text-primary" />
              <span>View Public Gallery</span>
              <ExternalLink size={11} className="text-primary/70" />
            </a>
            <Btn variant="primary" size="sm" onClick={() => handleOpenModal()}>
              <Plus size={13} /> Add Photo
            </Btn>
          </div>
        </div>

        {/* Toolbar: Search and Album Filter */}
        <AdminCard className="!p-3 sm:!p-3.5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-muted/60 border border-border/70 rounded-md px-3 py-1.5 flex-1 max-w-md shadow-2xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
              <Search size={14} className="text-muted-foreground/70 shrink-0" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search photo captions, titles, albums..."
                className="bg-transparent text-xs sm:text-sm focus:outline-none flex-1 text-foreground"
                style={{ fontFamily: "var(--font-sans, Inter), sans-serif" }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Album Select */}
            <div className="relative shrink-0 w-48 sm:w-56">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-muted/60 border border-border/70 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs capitalize"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="capitalize text-slate-800 bg-white">
                    {c === "all" ? "All Albums / Categories" : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Album Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider mr-1 hidden sm:inline">
              Albums:
            </span>
            {categories.slice(0, 6).map((cat) => {
              const active = filter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilter(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? "bg-primary text-white shadow-2xs"
                      : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {cat === "all" ? "All Photos" : cat}
                </button>
              );
            })}
          </div>
        </AdminCard>

        {/* Results Counter */}
        {!loading && (
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <strong className="text-foreground">{filtered.length}</strong>{" "}
              photo{filtered.length === 1 ? "" : "s"}
              {filter !== "all" ? ` in ${filter}` : ""}
            </span>
            {filter !== "all" && (
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="text-primary hover:underline font-semibold cursor-pointer"
              >
                Show all photos
              </button>
            )}
          </div>
        )}

        {/* Visual Image Grid */}
        {loading ? (
          <div className="text-center py-16 bg-card rounded-lg border border-border/80">
            <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading website gallery...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-lg border border-border/80 p-6">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <ImageIcon size={22} />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No gallery photos found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              {search || filter !== "all"
                ? "Try adjusting your search terms or album filters."
                : "Upload high-quality event photos to showcase your catering service on the website."}
            </p>
            {search || filter !== "all" ? (
              <Btn
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Reset Filters
              </Btn>
            ) : (
              <Btn variant="primary" size="sm" onClick={() => handleOpenModal()}>
                <Plus size={13} /> Add First Photo
              </Btn>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {paginatedItems.map((item) => (
                <AdminCard
                  key={item._id}
                  className="!p-0 hover:border-primary/40 hover:shadow-md transition-all overflow-hidden flex flex-col group cursor-pointer border border-border/80 bg-card relative"
                  onClick={() => setDrawerItem(item)}
                >
                  {/* Image Tile with Hover Preview Actions */}
                  <div className="w-full aspect-[4/3] bg-muted/30 overflow-hidden relative">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title || "Website Gallery Item"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-1">
                        <ImageIcon size={28} />
                        <span className="text-[11px]">No preview</span>
                      </div>
                    )}

                    {/* Category / Album Pill */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white shadow-2xs truncate max-w-[150px]">
                        {item.category || "General"}
                      </span>
                    </div>

                    {/* Hover Overlay Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerItem(item);
                        }}
                        className="p-2 rounded-full bg-white text-slate-800 hover:bg-white/90 shadow-md transition-all cursor-pointer pointer-events-auto active:scale-95"
                        title="View Photo Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(item);
                        }}
                        className="p-2 rounded-full bg-white text-slate-800 hover:bg-white/90 shadow-md transition-all cursor-pointer pointer-events-auto active:scale-95"
                        title="Edit Photo"
                      >
                        <Edit3 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                        {item.title || "Untitled Photo"}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="text-[11px] tabular-nums">
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : ""}
                      </span>

                      <div onClick={(e) => e.stopPropagation()}>
                        <RowActionsMenu actions={getRowActions(item)} />
                      </div>
                    </div>
                  </div>
                </AdminCard>
              ))}
            </div>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={totalItems}
              pageSize={PAGE_SIZE}
              shownCount={paginatedItems.length}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ============ MODALS & DRAWERS ============ */}
      {showModal && (
        <GalleryModal
          item={activeItem}
          onClose={handleCloseModal}
          onSave={() => {
            handleCloseModal();
            loadData();
          }}
        />
      )}

      {/* Photo Detail & Preview Drawer */}
      <GalleryDetailDrawer
        item={drawerItem}
        open={Boolean(drawerItem)}
        onOpenChange={(open) => !open && setDrawerItem(null)}
        onEdit={(item) => handleOpenModal(item)}
        onDelete={(item) => setCancelTarget(item)}
      />

      {/* Delete Confirmation Dialog */}
      {cancelTarget && (
        <ConfirmDialog
          title="Delete Gallery Photo"
          message={`Are you sure you want to delete "${cancelTarget.title || "this photo"}"? This will permanently remove it from the customer-facing website gallery.`}
          onConfirm={() => handleDelete(cancelTarget._id)}
          onCancel={() => setCancelTarget(null)}
          confirmText="Delete Photo"
          confirmVariant="danger"
        />
      )}
    </AdminLayout>
  );
}