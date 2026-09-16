import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Shared three-dot row-actions menu (design standard §03, rule 7).
 * actions: [{ key, label, icon, onSelect, destructive, disabled, divider }]
 * Every action opens a Modal/ConfirmDialog via onSelect — this menu never
 * mutates data itself.
 */
export default function RowActionsMenu({
  actions = [],
  triggerClassName,
  contentClassName,
  align = "end",
  sideOffset = 5,
  alignOffset = -2,
}) {
  const visible = actions.filter((a) => a && a.show !== false);
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "h-7 w-7 rounded-md inline-flex items-center justify-center text-slate-500 hover:text-[#4C81E0] hover:bg-blue-50/80 transition-colors cursor-pointer outline-none focus-visible:ring-1.5 focus-visible:ring-[#4C81E0]/50 data-[state=open]:bg-blue-50 data-[state=open]:text-[#4C81E0] data-[state=open]:ring-1 data-[state=open]:ring-blue-200/80 shrink-0",
            triggerClassName
          )}
          aria-label="Row actions"
          title="Row actions"
        >
          <MoreHorizontal size={15} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className={cn(
          "admin-shell admin-row-actions-content z-50 min-w-[175px] max-w-[240px] p-1.5 rounded-lg bg-white border border-slate-200/90 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12),0_8px_10px_-6px_rgba(15,23,42,0.04)] text-slate-700 font-sans",
          contentClassName
        )}
      >
        {visible.map((a, i) =>
          a.divider ? (
            <DropdownMenuSeparator
              key={`sep-${i}`}
              className="my-1 h-px bg-slate-100 -mx-1"
            />
          ) : (
            <DropdownMenuItem
              key={a.key || `action-${i}`}
              disabled={a.disabled}
              data-destructive={a.destructive ? "true" : undefined}
              onSelect={(e) => {
                a.onSelect?.(e);
              }}
              className={cn(
                "admin-row-actions-item w-full text-xs font-medium px-2.5 py-1.5 rounded-md flex items-center gap-2.5 cursor-pointer select-none transition-colors duration-150 outline-none text-slate-700 focus:bg-blue-50 focus:text-[#1d4ed8] data-[highlighted]:bg-blue-50 data-[highlighted]:text-[#1d4ed8] [&>svg]:text-slate-400 focus:[&>svg]:text-[#3b82f6] data-[highlighted]:[&>svg]:text-[#3b82f6]",
                a.destructive &&
                  "text-rose-600 focus:bg-rose-50 focus:text-rose-700 data-[highlighted]:bg-rose-50 data-[highlighted]:text-rose-700 [&>svg]:text-rose-500 focus:[&>svg]:text-rose-600 data-[highlighted]:[&>svg]:text-rose-600",
                a.disabled && "opacity-40 pointer-events-none cursor-not-allowed",
                a.className
              )}
            >
              {a.icon && <a.icon size={13.5} className="shrink-0 transition-colors" />}
              <span className="truncate">{a.label}</span>
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

