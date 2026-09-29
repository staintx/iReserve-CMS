import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Building2,
  Bot,
} from "lucide-react";
import { Badge } from "../ui/badge";
import {
  ACTION_LABELS,
  ACTION_BADGE_STYLES,
  ENTITY_META,
  ROLE_STYLES,
  timeAgo,
  formatTimeCompact,
  formatDateTimeFull,
} from "./systemLogsConfig";

function getInitials(name = "") {
  if (!name) return "SY";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * Compact inline Changes Cell
 */
function ChangesCell({ changes }) {
  const [expanded, setExpanded] = useState(false);

  if (!changes || typeof changes !== "object" || Object.keys(changes).length === 0) {
    return <span className="text-muted-foreground/60 text-xs">—</span>;
  }

  const entries = Object.entries(changes);
  const preview = entries.slice(0, 1);
  const hasMore = entries.length > 1;

  const renderEntry = ([field, val]) => {
    if (!val || typeof val !== "object") return null;
    const fromVal = String(val.from ?? "—");
    const toVal = String(val.to ?? "—");

    return (
      <div key={field} className="flex items-center gap-1.5 text-[11px] leading-tight flex-wrap">
        <span className="font-semibold text-foreground text-[10px] uppercase tracking-wider">{field}:</span>
        <span className="line-through text-slate-400 font-mono text-[10.5px] bg-slate-100/80 px-1 py-0.2 rounded truncate max-w-[85px]" title={fromVal}>
          {fromVal}
        </span>
        <span className="text-slate-400 text-[10px]">→</span>
        <span className="text-emerald-700 font-semibold font-mono text-[10.5px] bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/60 truncate max-w-[85px]" title={toVal}>
          {toVal}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-start gap-1" onClick={(e) => e.stopPropagation()}>
      {(expanded ? entries : preview).map(renderEntry)}
      {hasMore && (
        <button
          type="button"
          className="text-[10px] inline-flex items-center gap-0.5 font-semibold text-[#4C81E0] hover:underline cursor-pointer pt-0.5"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>Show less <ChevronUp size={11} /></>
          ) : (
            <>+{entries.length - 1} more <ChevronDown size={11} /></>
          )}
        </button>
      )}
    </div>
  );
}

export default function AdminSystemLogsTable({ logs = [], selectedLog = null, onSelectLog }) {
  return (
    <div className="w-full">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50/80 border-b border-border/80 text-[11px] font-bold uppercase tracking-wider text-muted-foreground select-none">
            <th className="py-2.5 px-3 font-semibold w-[130px]">Timestamp</th>
            <th className="py-2.5 px-3 font-semibold w-[145px]">User / Actor</th>
            <th className="py-2.5 px-3 font-semibold w-[165px]">Action</th>
            <th className="py-2.5 px-3 font-semibold w-[135px]">Entity</th>
            <th className="py-2.5 px-3 font-semibold">Details</th>
            <th className="py-2.5 px-3 font-semibold w-[210px]">Changes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {logs.length === 0 ? (
            <tr>
              <td colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
                No logs found.
              </td>
            </tr>
          ) : (
            logs.map((log) => {
              const isSelected = selectedLog?._id === log._id;
              const entityInfo = ENTITY_META[log.entity_type] || {
                label: log.entity_type || "System",
                icon: Building2,
              };
              const EntityIcon = entityInfo.icon;
              const actionLabel = ACTION_LABELS[log.action] || log.action;
              const actionStyle = ACTION_BADGE_STYLES[log.action] || "bg-blue-50 text-[#2C5EB5] border-blue-200/80";

              const userName = log.user_id?.full_name || log.user_id?.email || (log.user_id ? "Unknown User" : "System");
              const isSystem = !log.user_id || (!log.user_id?.full_name && !log.user_id?.email);
              const userRole = log.user_id?.role;

              return (
                <tr
                  key={log._id}
                  onClick={() => onSelectLog && onSelectLog(log)}
                  className={`group cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#4C81E0]/5 border-l-2 border-l-[#4C81E0]"
                      : "hover:bg-slate-50/70"
                  }`}
                >
                  {/* 1. Timestamp */}
                  <td className="py-2.5 px-3 align-top">
                    <div className="flex flex-col gap-0.5" title={formatDateTimeFull(log.createdAt)}>
                      <span className="text-xs font-semibold text-foreground leading-tight">
                        {timeAgo(log.createdAt)}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatTimeCompact(log.createdAt)}
                      </span>
                    </div>
                  </td>

                  {/* 2. User / Actor */}
                  <td className="py-2.5 px-3 align-top">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200/80 text-[10px] font-bold text-slate-700 flex items-center justify-center shrink-0">
                        {isSystem ? <Bot size={12} className="text-slate-500" /> : getInitials(userName)}
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <span className="text-xs font-medium text-foreground truncate max-w-[105px]" title={userName}>
                          {userName}
                        </span>
                        {userRole ? (
                          <span
                            className={`text-[9.5px] font-semibold uppercase tracking-wider px-1 py-0.2 rounded border w-fit capitalize leading-none mt-0.5 ${
                              ROLE_STYLES[userRole] || "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {userRole}
                          </span>
                        ) : isSystem ? (
                          <span className="text-[9.5px] font-semibold text-muted-foreground/80 tracking-tight leading-none mt-0.5">
                            Automated
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>

                  {/* 3. Action */}
                  <td className="py-2.5 px-3 align-top">
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-semibold py-0.5 px-2 rounded-md whitespace-nowrap shadow-2xs ${actionStyle}`}
                    >
                      {actionLabel}
                    </Badge>
                  </td>

                  {/* 4. Entity */}
                  <td className="py-2.5 px-3 align-top">
                    <div className="flex flex-col gap-1 items-start min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 text-slate-700">
                        <EntityIcon size={12} className="text-slate-500 shrink-0" />
                        <span className="text-xs font-medium text-foreground truncate capitalize">
                          {entityInfo.label}
                        </span>
                      </div>
                      {log.entity_id && (
                        <span
                          className="text-[10px] text-slate-600 bg-slate-100/90 px-1.5 py-0.2 rounded border border-slate-200/80 font-mono"
                          title={log.entity_id}
                        >
                          #{log.entity_id.slice(-6).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 5. Details */}
                  <td className="py-2.5 px-3 align-top">
                    <span
                      className="text-xs text-slate-600 leading-snug line-clamp-2 block"
                      title={log.details}
                    >
                      {log.details || "—"}
                    </span>
                  </td>

                  {/* 6. Changes */}
                  <td className="py-2.5 px-3 align-top">
                    <ChangesCell changes={log.changes} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
