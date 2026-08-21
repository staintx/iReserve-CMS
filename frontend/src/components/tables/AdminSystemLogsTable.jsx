import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";

const ACTION_LABELS = {
  business_info_updated: "Business Info Updated",
  package_created: "Package Created",
  package_updated: "Package Updated",
  package_deleted: "Package Deleted",
  menu_item_created: "Menu Item Created",
  menu_item_updated: "Menu Item Updated",
  menu_item_deleted: "Menu Item Deleted",
  menu_bulk_created: "Menu Bulk Created",
  addon_created: "Addon Created",
  addon_updated: "Addon Updated",
  addon_deleted: "Addon Deleted",
  addons_bulk_created: "Addons Bulk Created",
  inquiry_reviewed: "Inquiry Reviewed",
  inquiry_updated: "Inquiry Updated",
  inquiry_customer_status_update: "Customer Update",
  booking_created: "Booking Created",
  booking_created_from_inquiry: "Booking from Inquiry",
  booking_updated: "Booking Updated",
  booking_deleted: "Booking Deleted",
  booking_guests_added: "Guests Added",
  booking_upgraded: "Booking Upgraded",
  booking_change_requested: "Change Requested",
  booking_refunded: "Booking Refunded",
  booking_returns_verified: "Returns Verified",
  booking_inventory_assigned: "Inventory Assigned",
  ocular_scheduled: "Ocular Scheduled",
  ocular_completed: "Ocular Completed",
  ocular_requested: "Ocular Requested",
  booking_cancellation_requested: "Cancellation Requested",
  change_request_submitted: "Change Submitted",
  change_request_resolved: "Change Resolved",
  booking_revision_proposed: "Revision Proposed",
  booking_revision_accepted: "Revision Accepted",
  booking_revision_rejected: "Revision Rejected",
  quote_accepted: "Quote Accepted",
};

const ACTION_STYLES = {
  business_info_updated: "info",
  package_created: "success",
  package_updated: "info",
  package_deleted: "destructive",
  menu_item_created: "success",
  menu_item_updated: "info",
  menu_item_deleted: "destructive",
  menu_bulk_created: "success",
  addon_created: "success",
  addon_updated: "info",
  addon_deleted: "destructive",
  addons_bulk_created: "success",
  inquiry_reviewed: "secondary",
  inquiry_updated: "info",
  inquiry_customer_status_update: "warning",
  booking_created: "success",
  booking_created_from_inquiry: "success",
  booking_updated: "info",
  booking_deleted: "destructive",
  booking_guests_added: "info",
  booking_upgraded: "info",
  booking_change_requested: "warning",
  booking_refunded: "destructive",
  booking_returns_verified: "success",
  booking_inventory_assigned: "secondary",
  ocular_scheduled: "info",
  ocular_completed: "success",
  ocular_requested: "warning",
  booking_cancellation_requested: "destructive",
  change_request_submitted: "warning",
  change_request_resolved: "success",
  booking_revision_proposed: "warning",
  booking_revision_accepted: "success",
  booking_revision_rejected: "destructive",
  quote_accepted: "success",
};

const ENTITY_LABELS = {
  business_info: "Business Info",
  package: "Package",
  menu: "Menu",
  addon: "Addon",
  inquiry: "Inquiry",
  booking: "Booking",
};

const ROLE_STYLES = {
  admin: "default",
  manager: "secondary",
  staff: "outline",
  customer: "outline",
};

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function ChangesCell({ changes }) {
  const [expanded, setExpanded] = useState(false);

  if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const entries = Object.entries(changes);
  const preview = entries.slice(0, 1);
  const hasMore = entries.length > 1;

  const renderEntry = ([field, val]) => {
    if (!val || typeof val !== "object") return null;
    return (
      <div key={field} className="flex items-center gap-1.5 text-xs py-0.5">
        <span className="font-medium text-foreground">{field}</span>
        <span className="text-muted-foreground">→</span>
        <span className="line-through text-muted-foreground truncate max-w-[100px]">{String(val.from ?? "—")}</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-emerald-600 font-medium truncate max-w-[100px]">{String(val.to ?? "—")}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-start gap-1">
      {(expanded ? entries : preview).map(renderEntry)}
      {hasMore && (
        <button
          type="button"
          className="text-[10px] flex items-center gap-1 font-medium text-primary hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>Show less <ChevronUp size={10} /></>
          ) : (
            <>+{entries.length - 1} more <ChevronDown size={10} /></>
          )}
        </button>
      )}
    </div>
  );
}

export default function AdminSystemLogsTable({ logs }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Timestamp</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="min-w-[200px]">Changes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No logs found.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow key={log._id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">{timeAgo(log.createdAt)}</span>
                    <span className="text-[10px] text-muted-foreground" title={formatDateTime(log.createdAt)}>
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm font-medium text-foreground">
                      {log.user_id?.full_name || log.user_id?.email || "System"}
                    </span>
                    {log.user_id?.role && (
                      <Badge variant={ROLE_STYLES[log.user_id.role] || "outline"} className="text-[10px] py-0 h-4 capitalize">
                        {log.user_id.role}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={ACTION_STYLES[log.action] || "secondary"} className="whitespace-nowrap font-normal">
                    {ACTION_LABELS[log.action] || log.action}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {log.entity_type && (
                      <span className="text-xs font-medium text-foreground capitalize">
                        {ENTITY_LABELS[log.entity_type] || log.entity_type}
                      </span>
                    )}
                    {log.entity_id && (
                      <span className="text-[10px] text-muted-foreground bg-accent/50 px-1 rounded font-mono" title={log.entity_id}>
                        #{log.entity_id.slice(-6).toUpperCase()}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground max-w-[250px] truncate block" title={log.details}>
                    {log.details || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <ChangesCell changes={log.changes} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
