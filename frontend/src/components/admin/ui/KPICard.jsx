import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import AdminCard from "./AdminCard";

export default function KPICard({ title, value, sub, trend, up, icon: Icon, badge }) {
  return (
    <AdminCard className="!p-3.5 sm:!p-4 flex flex-col justify-between">
      <div className="flex justify-between items-center gap-2 mb-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
        {trend ? (
          <span className={`text-[10px] font-semibold font-mono flex items-center gap-0.5 px-2 py-0.5 rounded-md ${
            up ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-rose-50 text-rose-700 border border-rose-200/60"
          }`}>
            {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {trend}
          </span>
        ) : badge ? (
          <span className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
            {badge}
          </span>
        ) : Icon ? (
          <div className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center">
            <Icon size={13} />
          </div>
        ) : null}
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none mb-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
    </AdminCard>
  );
}


