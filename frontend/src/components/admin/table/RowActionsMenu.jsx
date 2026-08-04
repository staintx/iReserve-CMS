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
export default function RowActionsMenu({ actions = [] }) {
  const visible = actions.filter((a) => a.show !== false);
  if (visible.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg text-[#6B7280] hover:bg-gray-100 hover:text-[#111827] transition-colors"
          aria-label="Row actions"
        >
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {visible.map((a, i) =>
          a.divider ? (
            <DropdownMenuSeparator key={`sep-${i}`} />
          ) : (
            <DropdownMenuItem
              key={a.key}
              disabled={a.disabled}
              onSelect={() => a.onSelect?.()}
              className={cn(
                "text-xs gap-2",
                a.destructive && "text-red-600 focus:text-red-700 focus:bg-red-50"
              )}
            >
              {a.icon && <a.icon size={13} />}
              {a.label}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
