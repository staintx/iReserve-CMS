import useAuth from "../../hooks/useAuth";

export default function StaffHeader({ onCalendar }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 shadow-soft backdrop-blur">
      <div className="flex items-center gap-3 text-sm text-ink-700">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink-900 text-white">MENU</span>
        <div>
          <div className="text-sm font-semibold text-ink-900">Caezelle&apos;s Staff</div>
          <div className="text-xs text-slate-500">Task execution &amp; reporting</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {onCalendar && (
          <button className="btn" type="button" onClick={onCalendar}>
            My Calendar
          </button>
        )}
        <div className="text-xs font-semibold text-ink-700">{user?.full_name || "Staff"}</div>
        <button className="btn-ghost" type="button" onClick={logout}>Sign out</button>
      </div>
    </header>
  );
}
