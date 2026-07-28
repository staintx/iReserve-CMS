import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import AdminCard from "./AdminCard";

export default function KPICard({ title, value, sub, trend, up, color }) {
  return (
    <AdminCard className="!p-5">
      <div className="flex justify-between items-start mb-3">
        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">{title}</p>
        <span className={`text-xs font-bold flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-red-500"}`}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {trend}
        </span>
      </div>
      <p style={{ fontFamily: "Playfair Display, serif" }} className="text-3xl font-bold text-[#111111] mb-1">{value}</p>
      <p className="text-xs text-[#6B7280]">{sub}</p>
      <div className="mt-3 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={[{v:40},{v:55},{v:45},{v:70},{v:60},{v:80},{v:75}]}>
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AdminCard>
  );
}
