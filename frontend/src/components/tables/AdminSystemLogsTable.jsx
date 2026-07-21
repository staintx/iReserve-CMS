import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const ACTION_LABELS = {
  package_created: "Package Created",
  package_updated: "Package Updated",
  package_deleted: "Package Deleted",
  inquiry_reviewed: "Inquiry Reviewed",
  inquiry_updated: "Inquiry Updated",
  inquiry_customer_status_update: "Customer Update",
  booking_created: "Booking Created",
  booking_created_from_inquiry: "Booking from Inquiry",
  booking_updated: "Booking Updated",
  booking_deleted: "Booking Deleted",
};

const ACTION_STYLES = {
  package_created: "log-pill create",
  package_updated: "log-pill update",
  package_deleted: "log-pill delete",
  inquiry_reviewed: "log-pill review",
  inquiry_updated: "log-pill update",
  inquiry_customer_status_update: "log-pill info",
  booking_created: "log-pill create",
  booking_created_from_inquiry: "log-pill create",
  booking_updated: "log-pill update",
  booking_deleted: "log-pill delete",
};

const ENTITY_LABELS = {
  package: "Package",
  inquiry: "Inquiry",
  booking: "Booking",
};

const ROLE_STYLES = {
  admin: "log-role-pill admin",
  manager: "log-role-pill manager",
  staff: "log-role-pill staff",
  customer: "log-role-pill customer",
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
    return <span style={{ color: "#9ca3af", fontSize: "12px" }}>—</span>;
  }

  const entries = Object.entries(changes);
  const preview = entries.slice(0, 1);
  const hasMore = entries.length > 1;

  const renderEntry = ([field, val]) => {
    if (!val || typeof val !== "object") return null;
    return (
      <div key={field} className="log-change-item">
        <span className="log-change-field">{field}</span>
        <span className="log-change-arrow">→</span>
        <span className="log-change-from">{String(val.from ?? "—")}</span>
        <span className="log-change-arrow">→</span>
        <span className="log-change-to">{String(val.to ?? "—")}</span>
      </div>
    );
  };

  return (
    <div className="log-changes-wrap">
      {(expanded ? entries : preview).map(renderEntry)}
      {hasMore && (
        <button
          type="button"
          className="log-changes-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={12} />
            </>
          ) : (
            <>
              +{entries.length - 1} more <ChevronDown size={12} />
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function AdminSystemLogsTable({ logs }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>User</th>
          <th>Action</th>
          <th>Entity</th>
          <th>Details</th>
          <th>Changes</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log._id}>
            <td>
              <div className="log-timestamp">
                <span className="log-time-ago">{timeAgo(log.createdAt)}</span>
                <span className="log-time-full" title={formatDateTime(log.createdAt)}>
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            </td>
            <td>
              <div className="log-user-cell">
                <span className="log-user-name">
                  {log.user_id?.full_name || log.user_id?.email || "System"}
                </span>
                {log.user_id?.role && (
                  <span className={ROLE_STYLES[log.user_id.role] || "log-role-pill"}>
                    {log.user_id.role}
                  </span>
                )}
              </div>
            </td>
            <td>
              <span className={ACTION_STYLES[log.action] || "log-pill"}>
                {ACTION_LABELS[log.action] || log.action}
              </span>
            </td>
            <td>
              <div className="log-entity-cell">
                {log.entity_type && (
                  <span className="log-entity-type">
                    {ENTITY_LABELS[log.entity_type] || log.entity_type}
                  </span>
                )}
                {log.entity_id && (
                  <span className="log-entity-id" title={log.entity_id}>
                    #{log.entity_id.slice(-6)}
                  </span>
                )}
              </div>
            </td>
            <td>
              <span className="log-details-text">{log.details || "—"}</span>
            </td>
            <td>
              <ChangesCell changes={log.changes} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
