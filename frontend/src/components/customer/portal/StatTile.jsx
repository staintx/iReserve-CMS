import { cn } from "@/lib/utils";

/**
 * Modern shadcn/ClientsNext metric card style.
 * Top row: Label + floating unboxed icon
 * Middle: Large bold numerical value
 * Bottom: Secondary hint / trend text
 */
export default function StatTile({ icon: Icon, label, value, hint, onClick, className }) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 text-left transition-all duration-150 shadow-2xs",
        onClick && "hover:border-slate-300 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A] cursor-pointer",
        className
      )}
    >
      {/* Top Row: Bold Title + Clean Floating Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm sm:text-base font-bold text-slate-800 truncate font-sans">
          {label}
        </span>
        {Icon && (
          <Icon className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors stroke-[1.75]" aria-hidden="true" />
        )}
      </div>

      {/* Middle Row: Large Bold Value */}
      <div className="mt-3">
        <div className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 tabular-nums font-sans">
          {value}
        </div>
        {hint && (
          <p className="mt-1 text-xs text-slate-500 font-medium truncate">
            {hint}
          </p>
        )}
      </div>
    </Wrapper>
  );
}

