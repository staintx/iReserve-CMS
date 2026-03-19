import useAuth from "../../hooks/useAuth";

export default function ManagerHeader({ onCalendar }) {
  const { logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-6 py-4 shadow-soft backdrop-blur">
      <div className="flex items-center gap-3 text-sm text-ink-700">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink-900 text-white">≡</span>
        <div>
          <div className="text-sm font-semibold text-ink-900">Caezelle&apos;s Manager</div>
          <div className="text-xs text-slate-500">System Management</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {onCalendar && (
          <button className="btn" type="button" onClick={onCalendar}>
            My Calendar
          </button>
        )}
        <button className="btn-ghost" type="button" aria-label="Notifications">🔔</button>
        <button className="btn-ghost" type="button" onClick={logout}>Sign out</button>
      </div>
    </header>
  );
}
