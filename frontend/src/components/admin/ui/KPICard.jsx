import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import AdminCard from "./AdminCard";

export default function KPICard({ title, value, sub, trend, up, icon: Icon, badge }) {
  return (
    <AdminCard className="!p-3 sm:!p-3.5 flex flex-col justify-between">
      <div className="flex justify-between items-center gap-2 mb-1.5">
        <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
        {trend ? (
          <span className={`text-[10px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
            up ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-rose-50 text-rose-700 border border-rose-200/60"
          }`}>
            {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {trend}
          </span>
        ) : badge ? (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
            {badge}
          </span>
        ) : Icon ? (
          <div className="w-5.5 h-5.5 rounded bg-muted text-muted-foreground flex items-center justify-center">
            <Icon size={12} />
          </div>
        ) : null}
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none mb-1">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </AdminCard>
  );
}


