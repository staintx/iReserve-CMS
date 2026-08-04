import React, { useState, useEffect } from "react";
import { Eye, Mail, Star } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Badge from "../../components/admin/ui/Badge";
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
import Btn from "../../components/admin/ui/Btn";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";

export default function AdminCustomers() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerRow, setDrawerRow] = useState(null);

  const [minSpend, setMinSpend] = useState("");
  const [draftMinSpend, setDraftMinSpend] = useState("");

  useEffect(() => {
    AdminAPI.getCustomers()
      .then((res) => setCustomers(Array.isArray(res.data) ? res.data : []))
      .catch(() => notify("Failed to load customers", "error"))
      .finally(() => setLoading(false));
  }, [notify]);

  const tiers = ["all", "VIP", "Corporate", "Regular", "New"];

  const filtered = customers.filter((c) => {
    const matchSearch = !search || (c.full_name || "").toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === "all" || c.tier === tierFilter;
    const matchSpend = !minSpend || Number(c.spending || 0) >= Number(minSpend);
    return matchSearch && matchTier && matchSpend;
  });

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 });
  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Customers is not the busiest workflow, so its table keeps 5 columns —
  // whatever it takes to scan spend/activity/tier at a glance — rather than
  // being forced to match Reservations' 6.
  const columns = [
    {
      key: "name",
      header: "Customer",
      render: (c) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-xs font-bold text-[#D4AF37] shrink-0">
            {(c.full_name || "?").split(" ").map((n) => n[0]).join("")}
          </div>
          <span className="text-sm font-semibold text-[#111]">{c.full_name}</span>
        </div>
      ),
    },
    { key: "email", header: "Email", className: "text-xs text-[#374151]" },
    { key: "reservations", header: "Reservations", className: "text-xs text-center text-[#374151]" },
    { key: "spending", header: "Lifetime Spending", render: (c) => <span className="text-sm font-semibold text-[#111]">{fmt(c.spending)}</span> },
    { key: "tier", header: "Tier", render: (c) => <Badge status={c.tier} /> },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (c) => (
        <RowActionsMenu
          actions={[
            { key: "view", label: "View details", icon: Eye, onSelect: () => setDrawerRow(c) },
            {
              key: "email",
              label: "Email customer",
              icon: Mail,
              show: !!c.email,
              onSelect: () => { window.location.href = `mailto:${c.email}`; },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="p-6 space-y-5 bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111]">Customers</h2>
        </div>

        <AdminCard className="!p-4">
          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search customers..."
            quickFilters={tiers.map((t) => ({ value: t, label: t }))}
            activeQuickFilter={tierFilter}
            onQuickFilterChange={setTierFilter}
            right={
              <FilterPopover
                label="Filters"
                activeCount={minSpend ? 1 : 0}
                onApply={() => setMinSpend(draftMinSpend)}
                onClear={() => {
                  setDraftMinSpend("");
                  setMinSpend("");
                }}
              >
                <div>
                  <label className="text-xs font-semibold text-[#374151] block mb-1">Minimum lifetime spend (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={draftMinSpend}
                    onChange={(e) => setDraftMinSpend(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
              </FilterPopover>
            }
          />
          {minSpend && (
            <div className="flex items-center gap-2 mt-3">
              <FilterChip label={`Min spend: ${fmt(minSpend)}`} onRemove={() => { setMinSpend(""); setDraftMinSpend(""); }} />
            </div>
          )}
        </AdminCard>

        <AdminCard className="!p-0 overflow-hidden">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(c) => c._id}
            loading={loading}
            emptyTitle="No customers found."
            emptyHint={search || tierFilter !== "all" || minSpend ? "Try adjusting your search or filters." : undefined}
            onRowClick={(c) => setDrawerRow(c)}
            minWidth="760px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        <DetailDrawer
          open={!!drawerRow}
          onOpenChange={(open) => !open && setDrawerRow(null)}
          title={drawerRow?.full_name}
          description={drawerRow?.email}
          footer={
            drawerRow && (
              <>
                {drawerRow.email && (
                  <Btn variant="secondary" size="sm" onClick={() => { window.location.href = `mailto:${drawerRow.email}`; }}>
                    <Mail size={13} /> Email customer
                  </Btn>
                )}
                <Btn
                  variant="gold"
                  size="sm"
                  onClick={() => navigate(`/admin/bookings/reservations?search=${encodeURIComponent(drawerRow.full_name || "")}`)}
                >
                  View reservations
                </Btn>
              </>
            )
          }
        >
          {drawerRow && (
            <div className="grid grid-cols-2 gap-4">
              <DrawerField label="Phone" value={drawerRow.phone || "—"} />
              <DrawerField label="Tier" value={<Badge status={drawerRow.tier} />} />
              <DrawerField label="Lifetime Spending" value={fmt(drawerRow.spending)} />
              <DrawerField label="Reservations" value={drawerRow.reservations ?? 0} />
              <DrawerField label="Last Booking" value={formatDate(drawerRow.last_booking_date)} />
              <DrawerField
                label="Rating"
                value={
                  drawerRow.rating ? (
                    <div className="flex items-center gap-0.5">
                      {Array(5).fill(null).map((_, i) => (
                        <Star key={i} size={12} className={i < drawerRow.rating ? "text-[#D4AF37] fill-[#D4AF37]" : "text-gray-200 fill-gray-200"} />
                      ))}
                    </div>
                  ) : (
                    "—"
                  )
                }
              />
            </div>
          )}
        </DetailDrawer>
      </div>
    </AdminLayout>
  );
}
