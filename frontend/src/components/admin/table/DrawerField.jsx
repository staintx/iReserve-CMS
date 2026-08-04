/** Consistent label/value row for DetailDrawer bodies (design standard §03, rule 10). */
export default function DrawerField({ label, value, full = false }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">{label}</p>
      <div className="text-sm text-[#111827]">{value}</div>
    </div>
  );
}
