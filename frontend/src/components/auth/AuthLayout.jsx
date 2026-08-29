import { Link } from "react-router-dom";
import { ArrowLeft, CalendarCheck, MessageSquareText } from "lucide-react";
import logo from "../../assets/images/logo.jpg";
import backdrop from "../../assets/images/img-bg.jpg";
import { focusRing } from "./AuthUI";
import { cn } from "@/lib/utils";

const YEAR = new Date().getFullYear();

// Two markers, not a badge wall — and both name something the account actually
// does rather than making a generic "secure / trusted / easy" claim.
const MARKERS = [
  { icon: CalendarCheck, label: "Menus, guests, and payments in one place" },
  { icon: MessageSquareText, label: "Your event coordinator, reachable in-app" },
];

const WIDTHS = {
  default: "max-w-[26rem]",
  wide: "max-w-[34rem]",
};

function BrandMark({ tone = "light", className = "" }) {
  const light = tone === "light";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          light
            ? "border border-white/25 bg-white/10"
            : "border border-[#E2E8F0] bg-white shadow-sm"
        )}
      >
        <img src={logo} alt="" aria-hidden="true" className="h-full w-full object-cover" />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[11px] font-semibold uppercase tracking-[0.28em]",
            light ? "text-white" : "text-[#1E293B]"
          )}
        >
          Caezelle&rsquo;s
        </span>
        <span className={cn("block truncate text-xs", light ? "text-white/65" : "text-[#64748B]")}>
          Food, Catering &amp; Services
        </span>
      </span>
    </div>
  );
}

/**
 * Shared frame for every authentication screen.
 *
 * Desktop (≥1024px): an anchored two-column composition — a branded panel
 * carrying the photography and the promise, and a calm working column that owns
 * the task. Tablet and below: the panel drops away entirely, a compact brand bar
 * keeps context, and the form gets the viewport. The panel is decoration; the
 * form is the job.
 *
 * `width="wide"` is used only by registration, which pairs its fields into two
 * columns and needs the extra room to keep each input comfortable.
 */
export default function AuthLayout({
  title,
  body,
  children,
  width = "default",
  backTo = "/",
  backLabel = "Back to homepage",
}) {
  return (
    <div className="auth-shell flex min-h-screen flex-col bg-[#F8FAFC] lg:h-screen lg:overflow-hidden lg:flex-row">
      {/* ── Brand panel ───────────────────────────────────────────────── */}
      <aside
        className="relative hidden shrink-0 overflow-hidden lg:flex lg:w-[42%] lg:max-w-[580px] lg:h-full lg:flex-col lg:justify-between lg:p-8 xl:p-12"
        style={{
          backgroundImage: `url(${backdrop})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(155deg, rgba(30,41,59,0.94) 0%, rgba(44,75,138,0.82) 48%, rgba(15,23,42,0.94) 100%)",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#C5A059]/50 to-transparent"
        />

        <div className="auth-fade relative z-10">
          <BrandMark />
        </div>

        <div className="auth-rise relative z-10 max-w-md">
          <span className="mb-4 block h-[3px] w-10 rounded-full bg-[#C5A059]" aria-hidden="true" />
          <h2
            style={{ fontFamily: "Playfair Display, serif" }}
            className="text-[28px] font-semibold leading-[1.15] tracking-tight text-white xl:text-[34px]"
          >
            {title}
          </h2>
          {body && <p className="mt-3 text-sm leading-relaxed text-white/70">{body}</p>}
        </div>

        <ul className="auth-fade relative z-10 space-y-2">
          {MARKERS.map((marker) => {
            const Icon = marker.icon;
            return (
              <li
                key={marker.label}
                className="flex items-center gap-2.5 text-[13px] text-white/75"
              >
                <Icon size={15} className="shrink-0 text-[#C5A059]" aria-hidden="true" />
                {marker.label}
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ── Working column ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col lg:h-full lg:overflow-y-auto">
        <header className="flex items-center border-b border-[#E2E8F0] bg-white px-5 py-3 lg:hidden">
          <Link to="/" className={cn("rounded-lg", focusRing)} aria-label="Caezelle's home">
            <BrandMark tone="dark" />
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center px-4 py-4 sm:px-8 sm:py-6 lg:py-3 xl:py-6">
          <div className={cn("auth-rise mx-auto w-full", WIDTHS[width] || WIDTHS.default)}>
            {backTo && (
              <Link
                to={backTo}
                className={cn(
                  "mb-2.5 inline-flex items-center gap-1.5 rounded-lg text-[13px] font-medium text-[#64748B] transition-colors hover:text-[#1E293B]",
                  focusRing
                )}
              >
                <ArrowLeft size={14} aria-hidden="true" />
                {backLabel}
              </Link>
            )}

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:px-6 sm:py-5 xl:px-7 xl:py-6">
              {children}
            </div>
          </div>
        </main>

        <footer className="px-4 pb-3 pt-1 text-center text-xs text-[#64748B] sm:px-8">
          &copy; {YEAR} Caezelle&rsquo;s Food, Catering &amp; Services. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
