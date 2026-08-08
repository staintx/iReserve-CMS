/** Consistent label/value row for DetailDrawer bodies (design standard §03, rule 10). */
export default function DrawerField({ label, value, full = false }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}
