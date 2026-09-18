import React from "react";
import { Link } from "react-router-dom";
import { Edit3, Copy, Trash2, CheckCircle2, XCircle, Package, ExternalLink, Calendar, Tag } from "lucide-react";
import DetailDrawer from "../table/DetailDrawer";
import DrawerField from "../table/DrawerField";
import Badge from "../ui/Badge";
import Btn from "../ui/Btn";

export default function FoodDetailDrawer({
  item,
  open,
  onOpenChange,
  associatedPackages = [],
  onEdit,
  onDuplicate,
  onToggleAvailability,
  onDelete,
}) {
  if (!item) return null;

  const fmt = (n) =>
    n !== undefined && n !== null && n !== ""
      ? "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "—";

  const updatedDate = item.updatedAt
    ? new Date(item.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

  const createdDate = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const footer = (
    <div className="flex items-center justify-between gap-2 w-full pt-2">
      <div className="flex items-center gap-1.5">
        <Btn
          variant="outline"
          size="sm"
          onClick={() => {
            onOpenChange(false);
            onDuplicate(item);
          }}
          title="Duplicate this dish"
        >
          <Copy size={13} className="mr-1" /> Duplicate
        </Btn>
        <Btn
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => {
            onOpenChange(false);
            onDelete(item);
          }}
          title="Delete this dish"
        >
          <Trash2 size={13} />
        </Btn>
      </div>

      <div className="flex items-center gap-2">
        <Btn
          variant={item.available ? "outline" : "primary"}
          size="sm"
          onClick={() => onToggleAvailability(item)}
        >
          {item.available ? (
            <>
              <XCircle size={13} className="mr-1 text-red-500" /> Set Unavailable
            </>
          ) : (
            <>
              <CheckCircle2 size={13} className="mr-1 text-emerald-400" /> Set Available
            </>
          )}
        </Btn>
        <Btn
          variant="primary"
          size="sm"
          onClick={() => {
            onOpenChange(false);
            onEdit(item);
          }}
        >
          <Edit3 size={13} className="mr-1" /> Edit
        </Btn>
      </div>
    </div>
  );

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={item.name}
      description={`Category: ${item.category || "Uncategorized"}`}
      footer={footer}
    >
      <div className="space-y-5 py-2">
        {/* Dish Thumbnail preview */}
        {item.image_url ? (
          <div className="w-full h-48 rounded-lg overflow-hidden border border-border/80 bg-muted/30">
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-32 rounded-lg border border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground/60 gap-1.5">
            <Tag size={22} />
            <span className="text-xs font-medium">No dish photo uploaded</span>
          </div>
        )}

        {/* Quick Highlights */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/70">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price</span>
            <p className="text-base font-bold text-foreground mt-0.5">{fmt(item.price)}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Availability</span>
            <div className="mt-1">
              <Badge status={item.available ? "available" : "unavailable"} dot />
            </div>
          </div>
        </div>

        {/* Description */}
        <DrawerField label="Description">
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {item.description ? item.description : <span className="italic text-muted-foreground">No description provided.</span>}
          </p>
        </DrawerField>

        {/* Associated Packages */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Package size={13} className="text-primary" /> Associated Packages ({associatedPackages.length})
            </span>
          </div>

          {associatedPackages.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {associatedPackages.map((pkg) => (
                <div
                  key={pkg._id}
                  className="flex items-center justify-between p-2.5 rounded-md border border-border/70 bg-card hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-foreground truncate">{pkg.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {pkg.offer_type === "special" ? "Special Combo" : "Event Package"} · {pkg.event_type || "Catering"}
                    </p>
                  </div>
                  <Link
                    to="/admin/packages"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    View <ExternalLink size={11} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-md bg-muted/20 border border-dashed border-border/60 text-center">
              <p className="text-xs text-muted-foreground italic">
                This dish is not currently assigned to any package or combo.
              </p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="pt-3 border-t border-border/60 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold">Created</p>
              <p className="text-foreground/80 font-medium">{createdDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold">Last Updated</p>
              <p className="text-foreground/80 font-medium">{updatedDate}</p>
            </div>
          </div>
        </div>
      </div>
    </DetailDrawer>
  );
}
