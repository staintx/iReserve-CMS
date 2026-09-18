import React from "react";
import {
  ExternalLink,
  Edit3,
  Trash2,
  Calendar,
  Image as ImageIcon,
  Globe,
  Tag,
  Clock,
} from "lucide-react";
import DetailDrawer from "../table/DetailDrawer";
import DrawerField from "../table/DrawerField";
import Btn from "../ui/Btn";

/**
 * GalleryDetailDrawer
 * Focuses on what customers see on the public website:
 * - High-res photo presentation
 * - Customer-facing caption and album/category
 * - Description/story
 * - Public website status and preview link
 */
export default function GalleryDetailDrawer({
  item,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}) {
  if (!item) return null;

  const createdDate = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

  const updatedDate = item.updatedAt
    ? new Date(item.updatedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  const footer = (
    <div className="flex items-center justify-between gap-2 w-full pt-2">
      <Btn
        variant="ghost"
        size="sm"
        className="text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
        onClick={() => {
          onOpenChange(false);
          onDelete(item);
        }}
      >
        <Trash2 size={13} className="mr-1" /> Delete Photo
      </Btn>

      <div className="flex items-center gap-2">
        <Btn
          variant="secondary"
          size="sm"
          onClick={() => onOpenChange(false)}
        >
          Close
        </Btn>
        <Btn
          variant="primary"
          size="sm"
          onClick={() => {
            onOpenChange(false);
            onEdit(item);
          }}
        >
          <Edit3 size={13} className="mr-1" /> Edit Photo
        </Btn>
      </div>
    </div>
  );

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={item.title || "Gallery Photo Details"}
      description={`Album: ${item.category || "General"}`}
      footer={footer}
    >
      <div className="space-y-5 py-2">
        {/* Full Image Presentation */}
        {item.image_url ? (
          <div className="w-full rounded-lg overflow-hidden border border-border/80 bg-slate-900/5 relative group">
            <img
              src={item.image_url}
              alt={item.title || "Gallery photo"}
              className="w-full h-auto max-h-80 object-contain mx-auto bg-black/5"
            />
            <div className="p-2.5 bg-muted/40 border-t border-border/70 flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate max-w-[220px] font-medium text-[11.5px]">
                {item.title || "Gallery Asset"}
              </span>
              <a
                href={item.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-xs"
              >
                Open Full Size <ExternalLink size={11} />
              </a>
            </div>
          </div>
        ) : (
          <div className="w-full h-44 rounded-lg border border-dashed border-border/80 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground/60 gap-1.5">
            <ImageIcon size={32} />
            <span className="text-xs font-medium">No image preview available</span>
          </div>
        )}

        {/* Website Visibility Card */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/60 border border-blue-100/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Globe size={14} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Live on Public Website</p>
              <p className="text-[11px] text-muted-foreground">Visible to all visitors in the customer gallery</p>
            </div>
          </div>
          <a
            href="/gallery"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 bg-white border border-primary/20 px-2.5 py-1 rounded-md shadow-2xs hover:bg-powder transition-colors"
          >
            Visit Website <ExternalLink size={11} />
          </a>
        </div>

        {/* Album & Title */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/70">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Tag size={11} className="text-primary" /> Album / Category
            </span>
            <p className="text-sm font-bold text-foreground mt-0.5">{item.category || "General"}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock size={11} className="text-primary" /> Added To Gallery
            </span>
            <p className="text-xs font-semibold text-foreground mt-1 tabular-nums">{createdDate}</p>
          </div>
        </div>

        {/* Caption */}
        <DrawerField label="Public Caption / Title">
          <p className="text-sm font-semibold text-foreground">
            {item.title || <span className="italic text-muted-foreground font-normal">Untitled</span>}
          </p>
        </DrawerField>

        {/* Description / Story */}
        {item.description && (
          <DrawerField label="Description & Notes">
            <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed bg-muted/20 p-3 rounded-md border border-border/50">
              {item.description}
            </p>
          </DrawerField>
        )}

        {/* Metadata Details */}
        <div className="pt-3 border-t border-border/70 text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Last Updated:</span>
            <span className="text-foreground font-medium tabular-nums">{updatedDate}</span>
          </div>
          <div className="flex justify-between">
            <span>Asset ID:</span>
            <span className="font-mono text-[11px] text-muted-foreground">{item._id}</span>
          </div>
        </div>
      </div>
    </DetailDrawer>
  );
}
