import { useLocation, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import ConfirmDialog from "../common/ConfirmDialog";
import {
  CalendarCheck,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  UserRound,
  X,
} from "lucide-react";
import FloatingChatWidget from "../chat/FloatingChatWidget";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

// One nav definition drives desktop and mobile so the two can never drift.
// `section` entries scroll to a landing anchor; everything else is a route.
const NAV_ITEMS = [
  { label: "Home", to: "/" },
  { label: "Packages", to: "/packages" },
  { label: "Menu", to: "/menu" },
  { label: "Gallery", to: "/gallery" },
  { label: "Contact", section: "contact" },
];

// Signed-in destinations. One definition drives the desktop account menu and
// the mobile drawer so the two can't drift, exactly as NAV_ITEMS does. Order
// and labels match the customer portal's own sidebar
// (CustomerDashboardLayout), so the two never disagree about what exists.
const ACCOUNT_ITEMS = [
  { label: "Dashboard", to: "/customer/dashboard", Icon: LayoutDashboard },
  { label: "My Inquiries", to: "/customer/inquiries", Icon: FileText },
  { label: "My Bookings", to: "/customer/bookings", Icon: CalendarCheck },
  { label: "Messages", to: "/customer/messages", Icon: MessageSquare },
  { label: "Profile", to: "/customer/profile", Icon: UserRound },
];

export default function CustomerLayout({
  children,
  contentClassName,
  /** Opt in to the customer marketing palette. Booking/quote/checkout stay off it. */
  marketing = false,
  /** Landing only: start transparent over the hero, turn solid on scroll. */
  overlayHeader = false,
  /** Optional ref onto <main>, used by the scroll-reveal observer. */
  mainRef,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const drawerCloseRef = useRef(null);
  const navToggleRef = useRef(null);

  // The overlay header only stays transparent while the hero is still behind
  // it. Anything past a short scroll gets the solid, legible treatment.
  useEffect(() => {
    if (!overlayHeader) return undefined;

    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlayHeader]);

  // Drawer: lock the page, close on Escape, and hand focus to the close button
  // so keyboard users land inside the panel rather than behind it.
  useEffect(() => {
    if (!drawerOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    navToggleRef.current?.focus();
  }, []);

  const scrollToSection = (sectionId) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isCurrent = (item) => {
    if (item.section) return false;
    if (item.to === "/") return location.pathname === "/";
    return location.pathname.startsWith(item.to);
  };

  const handleNavClick = (item) => (event) => {
    event.preventDefault();
    setDrawerOpen(false);

    if (item.section) {
      if (location.pathname !== "/") {
        navigate(`/#${item.section}`);
        return;
      }
      scrollToSection(item.section);
      return;
    }

    if (item.to === "/" && location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    navigate(item.to);
  };

  // Matches the landing page's "Book Now" CTA: both send customers straight
  // to the packages catalog rather than into the booking wizard.
  const goToPackages = () => {
    setDrawerOpen(false);
    navigate("/packages");
  };

  const navHref = (item) => (item.section ? `/#${item.section}` : item.to);

  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "CU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const displayName = user?.full_name || "My account";
  const isAccountCurrent = (item) => location.pathname.startsWith(item.to);

  const goToAccount = (item) => () => {
    setDrawerOpen(false);
    navigate(item.to);
  };

  const headerState = !overlayHeader
    ? ""
    : scrolled
      ? "ls-header--solid"
      : "ls-header--overlay";

  return (
    <div className={`page-shell${marketing ? " customer-shell" : ""}`}>
      <header className={`ls-header ${headerState}`}>
        <div className="ls-inner ls-header-inner">
          <button
            type="button"
            className="ls-brand"
            onClick={() => navigate("/")}
            aria-label="Caezelle's Catering — home"
          >
            <img src={logo} alt="" className="ls-brand-logo" />
            <span>
              <span className="ls-brand-name">Caezelle's</span>
              <span className="ls-brand-sub">Catering</span>
            </span>
          </button>

          <nav className="ls-nav" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={navHref(item)}
                className={`ls-nav-link${isCurrent(item) ? " is-current" : ""}`}
                aria-current={isCurrent(item) ? "page" : undefined}
                onClick={handleNavClick(item)}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ls-header-actions">
            {!user && (
              <button
                type="button"
                className="ls-btn ls-btn--sm ls-btn--ghost ls-header-login"
                onClick={() => navigate("/login")}
              >
                Log in
              </button>
            )}

            {/* Booking is the primary action whether or not you are signed in —
                signed-in customers are the likeliest to book, and the CTA used
                to vanish for them entirely. */}
            <button
              type="button"
              className="ls-btn ls-btn--sm ls-btn--primary"
              onClick={goToPackages}
            >
              Book an Event
            </button>

            {user && (
              /* modal={false} is load-bearing. In its default modal mode Radix
                 locks the page with react-remove-scroll, which sets
                 `overflow: hidden` on <body> — that turns body into a scroll
                 container and kills `position: sticky` on the header, so
                 opening the menu made the nav jump and the scrollbar
                 disappear. Non-modal keeps outside-click and Escape working
                 without touching body. */
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="ls-account-trigger"
                    type="button"
                    aria-label={`Account menu for ${displayName}`}
                  >
                    <span className="ls-avatar" aria-hidden="true">
                      {initials}
                    </span>
                    <span className="ls-account-name">{displayName}</span>
                    <ChevronDown
                      size={15}
                      className="ls-account-caret"
                      aria-hidden="true"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="ls-account-menu"
                >
                  <div className="ls-account-id">
                    <div className="ls-account-id-name">{displayName}</div>
                    {user.email && (
                      <div className="ls-account-id-email">{user.email}</div>
                    )}
                  </div>

                  <div className="ls-account-section">
                    {ACCOUNT_ITEMS.map((item) => {
                      const Icon = item.Icon;
                      const current = isAccountCurrent(item);
                      return (
                        <DropdownMenuItem
                          key={item.to}
                          className="ls-account-item"
                          aria-current={current ? "page" : undefined}
                          onClick={goToAccount(item)}
                        >
                          <Icon size={16} aria-hidden="true" />
                          {item.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </div>

                  <div className="ls-account-footer">
                    <DropdownMenuItem
                      className="ls-account-item ls-account-item--logout"
                      onClick={() => setShowLogoutConfirm(true)}
                    >
                      <LogOut size={16} aria-hidden="true" />
                      Log out
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button
              type="button"
              ref={navToggleRef}
              className="ls-navtoggle"
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              aria-controls="customer-nav-drawer"
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <div className="ls-drawer">
          <button
            type="button"
            className="ls-drawer-scrim"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={closeDrawer}
          />
          <div
            id="customer-nav-drawer"
            className="ls-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
          >
            <div className="ls-drawer-head">
              <span className="ls-drawer-title">Menu</span>
              <button
                type="button"
                ref={drawerCloseRef}
                className="ls-navtoggle"
                aria-label="Close menu"
                onClick={closeDrawer}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {user && (
              <div className="ls-drawer-id">
                <span className="ls-avatar ls-avatar--lg" aria-hidden="true">
                  {initials}
                </span>
                <span className="ls-drawer-id-text">
                  <span className="ls-drawer-id-name">{displayName}</span>
                  {user.email && (
                    <span className="ls-drawer-id-email">{user.email}</span>
                  )}
                </span>
              </div>
            )}

            <nav aria-label="Mobile">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={navHref(item)}
                  className={`ls-drawer-link${isCurrent(item) ? " is-current" : ""}`}
                  aria-current={isCurrent(item) ? "page" : undefined}
                  onClick={handleNavClick(item)}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            {/* The account trigger is hidden below the desktop breakpoint, so
                the drawer is where a signed-in customer reaches their account
                on mobile — previously it was unreachable there. */}
            {user && (
              <>
                <p className="ls-drawer-label">My account</p>
                <nav aria-label="Account">
                  {ACCOUNT_ITEMS.map((item) => {
                    const Icon = item.Icon;
                    const current = isAccountCurrent(item);
                    return (
                      <a
                        key={item.to}
                        href={item.to}
                        className={`ls-drawer-link ls-drawer-link--account${current ? " is-current" : ""}`}
                        aria-current={current ? "page" : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          goToAccount(item)();
                        }}
                      >
                        <Icon size={17} aria-hidden="true" />
                        {item.label}
                      </a>
                    );
                  })}
                  <button
                    type="button"
                    className="ls-drawer-link ls-drawer-link--account ls-drawer-link--logout"
                    onClick={() => {
                      setDrawerOpen(false);
                      setShowLogoutConfirm(true);
                    }}
                  >
                    <LogOut size={17} aria-hidden="true" />
                    Log out
                  </button>
                </nav>
              </>
            )}

            <div className="ls-drawer-actions">
              <button
                type="button"
                className="ls-btn ls-btn--primary ls-btn--block"
                onClick={goToPackages}
              >
                Book an Event
              </button>
              {!user && (
                <button
                  type="button"
                  className="ls-btn ls-btn--ghost ls-btn--block"
                  onClick={() => {
                    setDrawerOpen(false);
                    navigate("/login");
                  }}
                >
                  Log in
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <main
        ref={mainRef}
        className={
          contentClassName ?? "mx-auto max-w-6xl px-6 pb-16 pt-10 sm:px-10"
        }
      >
        {children}
      </main>

      <FloatingChatWidget />

      {showLogoutConfirm && (
        <ConfirmDialog
          message="Are you sure you want to log out?"
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            setShowLogoutConfirm(false);
            logout();
          }}
        />
      )}
    </div>
  );
}
