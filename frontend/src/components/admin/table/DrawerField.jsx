/** Consistent label/value row for DetailDrawer bodies (design standard §03, rule 10). */
export default function DrawerField({ label, value, full = false }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
