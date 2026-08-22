import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import CustomerFooter from "../../components/layout/CustomerFooter";
import useBusinessInfo, { DEFAULT_BUSINESS_INFO } from "../../hooks/useBusinessInfo";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { CustomerAPI } from "../../api/customer";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * `Gallery.category` is a free-text field with no dropdown behind it in the
 * admin form, exactly like MenuItem.category — and in the live data it is
 * unset on every record. So the filter row is built from whatever categories
 * actually exist and hides itself entirely when there are none, rather than
 * offering the old hardcoded Weddings / Birthday / Corporate Events / Food
 * Display buttons, three of which matched nothing.
 */
const titleCase = (value) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default function Gallery() {
  const navigate = useNavigate();
  const businessInfo = useBusinessInfo();
  const [gallery, setGallery] = useState({ status: "loading", data: [] });
  const [activeCategory, setActiveCategory] = useState("all");
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const fetchGallery = useCallback(
    () =>
      CustomerAPI.getGallery()
        .then((res) => ({
          status: "ready",
          data: Array.isArray(res?.data) ? res.data.filter((item) => item?.image_url) : [],
        }))
        .catch(() => ({ status: "error", data: [] })),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetchGallery().then((next) => {
      if (!cancelled) setGallery(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchGallery]);

  const retry = () => {
    setGallery((prev) => ({ ...prev, status: "loading" }));
    fetchGallery().then(setGallery);
  };

  const items = gallery.data;

  const categories = useMemo(() => {
    const byKey = new Map();
    items.forEach((item) => {
      const raw = String(item.category || "").trim();
      if (!raw) return;
      const key = raw.toLowerCase();
      const existing = byKey.get(key);
      if (existing) {
        existing.count += 1;
        return;
      }
      byKey.set(key, { key, label: titleCase(raw), count: 1 });
    });
    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  // A category that vanished must not strand the page on an empty filter.
  const selectedCategory = categories.some((c) => c.key === activeCategory)
    ? activeCategory
    : "all";

  const filtered = useMemo(() => {
    if (selectedCategory === "all") return items;
    return items.filter(
      (item) => String(item.category || "").trim().toLowerCase() === selectedCategory,
    );
  }, [items, selectedCategory]);

  const motionSignal = `${gallery.status}|${selectedCategory}|${filtered.length}`;
  const revealScope = useRevealOnScroll(motionSignal);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const stepLightbox = useCallback(
    (delta) => {
      setLightboxIndex((current) => {
        if (current === null || filtered.length === 0) return current;
        return (current + delta + filtered.length) % filtered.length;
      });
    },
    [filtered.length],
  );

  useEffect(() => {
    if (lightboxIndex === null) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") stepLightbox(-1);
      if (event.key === "ArrowRight") stepLightbox(1);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxIndex, closeLightbox, stepLightbox]);

  // Changing the filter can shrink the list under an open lightbox.
  const activeItem = lightboxIndex === null ? null : filtered[lightboxIndex];

  const contactNumber =
    businessInfo.contact_number || DEFAULT_BUSINESS_INFO.contact_number;

  return (
    <CustomerLayout marketing contentClassName="ls-main" mainRef={revealScope}>
      <div className="ls-pagehead">
        <div className="ls-inner">
          <span className="ls-rule" aria-hidden="true" />
          <p className="ls-eyebrow">Our work</p>
          <h1>Events we have catered</h1>
          <p className="ls-lede">
            Food, setups, and tables from real events. Have a look at what we
            build, then tell us what you have in mind for yours.
          </p>
        </div>
      </div>

      {gallery.status === "ready" && categories.length > 0 && (
        <div className="ls-filterbar">
          <div className="ls-inner ls-filterbar-inner">
            <div className="ls-chips" role="group" aria-label="Filter photos by category">
              <button
                type="button"
                className="ls-chip"
                aria-pressed={selectedCategory === "all"}
                onClick={() => {
                  setActiveCategory("all");
                  setLightboxIndex(null);
                }}
              >
                All photos
              </button>
              {categories.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  className="ls-chip"
                  aria-pressed={selectedCategory === category.key}
                  onClick={() => {
                    setActiveCategory(category.key);
                    setLightboxIndex(null);
                  }}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="ls-band ls-band--page" aria-label="Photo gallery">
        <div className="ls-inner ls-inner--wide">
          {gallery.status === "loading" && (
            <div className="ls-gal-grid" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((key) => (
                <div className="ls-skel ls-gal-card" key={key} />
              ))}
            </div>
          )}

          {gallery.status === "error" && (
            <div className="ls-state" role="status">
              <p className="ls-state-title">We couldn't load the photos</p>
              <p>
                Something went wrong on our side. Try again in a moment, or call
                us and we'll happily talk you through the kind of events we do.
              </p>
              <div className="ls-state-actions">
                <button type="button" className="ls-btn ls-btn--sm ls-btn--ghost" onClick={retry}>
                  Try again
                </button>
                <a
                  className="ls-btn ls-btn--sm ls-btn--ghost"
                  href={`tel:${contactNumber.replace(/\s+/g, "")}`}
                >
                  Call {contactNumber}
                </a>
              </div>
            </div>
          )}

          {gallery.status === "ready" && items.length === 0 && (
            <div className="ls-state">
              <p className="ls-state-title">No photos here yet</p>
              <p>
                We're putting this together. In the meantime, the menu and
                packages show what we can do for your event.
              </p>
              <div className="ls-state-actions">
                <button
                  type="button"
                  className="ls-btn ls-btn--sm ls-btn--ghost"
                  onClick={() => navigate("/packages")}
                >
                  Browse packages
                </button>
              </div>
            </div>
          )}

          {gallery.status === "ready" && items.length > 0 && (
            <>
              <div className="ls-menu-section-head">
                <h2>
                  {filtered.length} {filtered.length === 1 ? "photo" : "photos"}
                  {selectedCategory !== "all"
                    ? ` in ${categories.find((c) => c.key === selectedCategory)?.label}`
                    : ""}
                </h2>
              </div>

              {filtered.length === 0 ? (
                <div className="ls-state">
                  <p className="ls-state-title">Nothing in this category yet</p>
                  <p>Try another one, or view all our photos.</p>
                  <div className="ls-state-actions">
                    <button
                      type="button"
                      className="ls-btn ls-btn--sm ls-btn--ghost"
                      onClick={() => setActiveCategory("all")}
                    >
                      Show all photos
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="ls-gal-grid ls-reveal ls-stagger"
                  data-count={filtered.length <= 3 ? filtered.length : undefined}
                >
                  {filtered.map((item, index) => (
                    <button
                      type="button"
                      key={item._id || item.image_url}
                      className="ls-gal-card"
                      onClick={() => setLightboxIndex(index)}
                      aria-label={`View photo ${index + 1} of ${filtered.length}${item.title ? `: ${item.title}` : ""}`}
                    >
                      <img
                        src={item.image_url}
                        alt={item.title || "A catered event by Caezelle's"}
                        loading="lazy"
                      />
                      {item.title && (
                        <span className="ls-gal-caption">{item.title}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="ls-band ls-band--ink" aria-labelledby="gallery-bridge-title">
        <div className="ls-inner ls-bridge ls-reveal">
          <div>
            <span className="ls-rule" aria-hidden="true" />
            <h2 className="ls-title" id="gallery-bridge-title">
              Want something like this?
            </h2>
            <p className="ls-lede">
              Tell us your date, guest count, and the kind of event you're
              planning, and we'll put a quote together for you.
            </p>
          </div>
          <div className="ls-bridge-actions">
            <button
              type="button"
              className="ls-btn ls-btn--onink"
              onClick={() =>
                navigate("/customer/book", { state: { resetWizard: true } })
              }
            >
              Book an Event
            </button>
            <button
              type="button"
              className="ls-btn ls-btn--light"
              onClick={() => navigate("/packages")}
            >
              Browse Packages
            </button>
          </div>
        </div>
      </section>

      <CustomerFooter businessInfo={businessInfo} />

      {activeItem && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${lightboxIndex + 1} of ${filtered.length}`}
          onClick={closeLightbox}
        >
          <button
            className="lightbox-close"
            type="button"
            aria-label="Close photo"
            onClick={closeLightbox}
          >
            <X size={22} aria-hidden="true" />
          </button>

          {filtered.length > 1 && (
            <button
              className="lightbox-nav lightbox-nav-prev"
              type="button"
              aria-label="Previous photo"
              onClick={(event) => {
                event.stopPropagation();
                stepLightbox(-1);
              }}
            >
              <ChevronLeft size={28} aria-hidden="true" />
            </button>
          )}

          <img
            src={activeItem.image_url}
            alt={activeItem.title || "A catered event by Caezelle's"}
            className="lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />

          {filtered.length > 1 && (
            <button
              className="lightbox-nav lightbox-nav-next"
              type="button"
              aria-label="Next photo"
              onClick={(event) => {
                event.stopPropagation();
                stepLightbox(1);
              }}
            >
              <ChevronRight size={28} aria-hidden="true" />
            </button>
          )}

          <p className="lightbox-meta">
            {activeItem.title && <span>{activeItem.title}</span>}
            <span className="lightbox-count">
              {lightboxIndex + 1} / {filtered.length}
            </span>
          </p>
        </div>
      )}
    </CustomerLayout>
  );
}
