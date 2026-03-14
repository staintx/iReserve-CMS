import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";

export default function AdminHeader() {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/70 bg-white/80 px-6 shadow-soft backdrop-blur">
      <div className="flex items-center gap-3">
        <button className="btn-ghost" type="button">≡</button>
        <img src={logo} alt="Caezelle's logo" className="h-8 w-8 rounded-2xl object-cover" />
        <span className="text-sm font-semibold">Caezelle's Catering</span>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn" onClick={logout} type="button">Sign out</button>
      </div>
    </header>
  );
}