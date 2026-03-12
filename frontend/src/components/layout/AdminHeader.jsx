import useAuth from "../../hooks/useAuth";

export default function AdminHeader() {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/70 bg-white/80 px-6 shadow-soft backdrop-blur">
      <button className="btn-ghost" type="button">Menu</button>
      <div className="flex items-center gap-3">
        <button className="btn-ghost" type="button">Alerts</button>
        <button className="btn" onClick={logout} type="button">Sign out</button>
      </div>
    </header>
  );
}