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
        "group relative flex flex-col justify-between rounded-md border border-slate-200 bg-white p-5 text-left transition-all shadow-2xs",
        onClick && "hover:border-slate-300 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A] cursor-pointer",
        className
      )}
    >
      {/* Top Row: Label & Floating Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate font-sans">
          {label}
        </span>
        {Icon && (
          <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors" aria-hidden="true" />
        )}
      </div>

      {/* Middle Row: Large Value */}
      <div className="mt-2.5">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums font-sans">
          {value}
        </div>
        {hint && (
          <p className="mt-1 text-xs text-slate-500 font-normal truncate">
            {hint}
          </p>
        )}
      </div>
    </Wrapper>
  );
}

