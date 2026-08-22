import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import CustomerFooter from "../../components/layout/CustomerFooter";
import useBusinessInfo, { DEFAULT_BUSINESS_INFO } from "../../hooks/useBusinessInfo";
import { CustomerAPI } from "../../api/customer";
import {
  SERVICE_LABELS,
  capacityLabel,
  eventTypeForPackage,
  perGuestPrice,
  priceLabel,
  serviceLabel,
} from "../../lib/packageDisplay";
import {
  isSpecialOffer,
  offerGuestCount,
  offerPricePerPax,
  offerFoodByCategory,
} from "../../lib/specialOffers";

const peso = (amount) =>
  "₱" + Number(amount || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 });

// Order the service filters the way the booking flow presents them.
const SERVICE_ORDER = ["Event Setup Only"];

export default function Packages() {
  const navigate = useNavigate();
  const businessInfo = useBusinessInfo();
  const [packages, setPackages] = useState({ status: "loading", data: [] });
  const [service, setService] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const fetchPackages = useCallback(
    () =>
      CustomerAPI.getPackages()
        .then((res) => ({
          status: "ready",
          data: Array.isArray(res?.data) ? res.data : [],
        }))
        .catch(() => ({ status: "error", data: [] })),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetchPackages().then((next) => {
      if (!cancelled) setPackages(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPackages]);

  const retry = () => {
    setPackages((prev) => ({ ...prev, status: "loading" }));
    fetchPackages().then(setPackages);
  };

  const published = useMemo(
    () => packages.data.filter((pkg) => pkg?.available !== false),
    [packages.data],
  );

  // Combo packs lead the page. They are the same kind of record as the
  // packages below and live in the same section, but they are what the
  // business is actively promoting, so they get their own band rather than
  // being lost in a grid of twenty cards.
  const offers = useMemo(() => published.filter(isSpecialOffer), [published]);

  // The filters below apply to regular packages only: an offer is priced per
  // person against a fixed rate, so a "price per guest" range and a service
  // filter have nothing to say about it.
  const available = useMemo(
    () => published.filter((pkg) => !isSpecialOffer(pkg)),
    [published],
  );

  // Filter options come from the data, so a filter can never match nothing.
  const serviceOptions = useMemo(() => {
    const present = new Set(
      available.map((pkg) => pkg.package_type).filter((type) => SERVICE_LABELS[type]),
    );
    return SERVICE_ORDER.filter((type) => present.has(type));
  }, [available]);

  const eventOptions = useMemo(
    () =>
      [...new Set(available.map(eventTypeForPackage).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [available],
  );

  // A filter whose option vanished must not strand the page on an empty list.
  const selectedService = serviceOptions.includes(service) ? service : "all";
  const selectedEvent = eventOptions.includes(eventType) ? eventType : "all";

  const hasPriceFilter = priceMin !== "" || priceMax !== "";
  const hasAnyFilter =
    selectedService !== "all" || selectedEvent !== "all" || hasPriceFilter;

  const filtered = useMemo(
    () =>
      available.filter((pkg) => {
        if (selectedService !== "all" && pkg.package_type !== selectedService) {
          return false;
        }
        if (selectedEvent !== "all" && eventTypeForPackage(pkg) !== selectedEvent) {
          return false;
        }

        if (hasPriceFilter) {
          // Only per-guest packages have a figure this range can compare
          // against; the filter's help text says so out loud.
          const perGuest = perGuestPrice(pkg);
          if (!perGuest) return false;
          if (priceMin !== "" && perGuest < Number(priceMin)) return false;
          if (priceMax !== "" && perGuest > Number(priceMax)) return false;
        }

        return true;
      }),
    [available, selectedService, selectedEvent, hasPriceFilter, priceMin, priceMax],
  );

  const clearFilters = () => {
    setService("all");
    setEventType("all");
    setPriceMin("");
    setPriceMax("");
  };

  /**
   * The sticky bar's real height, published as a custom property.
   *
   * The section anchors have to clear it, and its height genuinely varies —
   * the filter row is absent when no regular packages are published, and the
   * fields wrap at different widths. A hardcoded offset would either hide the
   * heading under the bar or leave a gap of dead space above it, so it is
   * measured rather than guessed.
   */
  const filterBarRef = useRef(null);

  useEffect(() => {
    const node = filterBarRef.current;
    if (!node) {
      document.documentElement.style.removeProperty("--ls-filterbar-h");
      return undefined;
    }

    const publish = () =>
      document.documentElement.style.setProperty(
        "--ls-filterbar-h",
        `${Math.round(node.getBoundingClientRect().height)}px`,
      );

    publish();

    // ResizeObserver is not in every browser this reaches; without it the
    // measurement simply stays at whatever the first paint produced, which is
    // still better than a guess.
    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(publish) : null;
    observer?.observe(node);
    window.addEventListener("resize", publish);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", publish);
      document.documentElement.style.removeProperty("--ls-filterbar-h");
    };
  }, [packages.status, available.length, offers.length]);

  const contactNumber =
    businessInfo.contact_number || DEFAULT_BUSINESS_INFO.contact_number;

  return (
    <CustomerLayout marketing contentClassName="ls-main">
      <div className="ls-pagehead">
        <div className="ls-inner">
          <span className="ls-rule" aria-hidden="true" />
          <p className="ls-eyebrow">Packages</p>
          <h1>Packages &amp; Combo Packs</h1>
          <p className="ls-lede">
            Our regular packages set your event styling, equipment, and scaffold
            size, with catering added when you book. Our combo packs are fixed
            meals, each built for a set number of guests at a set price per pax.
          </p>
        </div>
      </div>

      {/* One sticky bar, in the order the page is used: which section you want,
          then how to narrow it, then the results. The bar was previously
          rendered after both listings, so it stuck to nothing and a customer
          met the filters only once they had finished scrolling past everything
          the filters were for. */}
      {packages.status === "ready" && (available.length > 0 || offers.length > 0) && (
        <div className="ls-filterbar" ref={filterBarRef}>
          <div className="ls-inner ls-packagenav">
            <nav aria-label="Package sections">
              <a className="ls-packagenav-link" href="#regular-packages">
                Regular Packages
                <span>{available.length}</span>
              </a>
              {offers.length > 0 && (
                <a className="ls-packagenav-link" href="#special-offers">
                  Combo Packs
                  <span>{offers.length}</span>
                </a>
              )}
            </nav>
          </div>

          {/* Filters describe setup size and price per guest, neither of which
              says anything about a fixed combo — so they are scoped to the
              regular catalogue and say so, rather than appearing to filter a
              section they cannot touch. */}
          {available.length > 0 && (
          <div className="ls-inner ls-filterbar-inner">
            {serviceOptions.length > 1 && (
              <div className="ls-chips" role="group" aria-label="Filter by what's included">
                <button
                  type="button"
                  className="ls-chip"
                  aria-pressed={selectedService === "all"}
                  onClick={() => setService("all")}
                >
                  All packages
                </button>
                {serviceOptions.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="ls-chip"
                    aria-pressed={selectedService === type}
                    onClick={() => setService(type)}
                  >
                    {SERVICE_LABELS[type]}
                  </button>
                ))}
              </div>
            )}

            <div className="ls-filters">
              {eventOptions.length > 0 && (
                <div className="ls-field">
                  <label htmlFor="package-event">Event</label>
                  <select
                    id="package-event"
                    value={selectedEvent}
                    onChange={(event) => setEventType(event.target.value)}
                  >
                    <option value="all">Any event</option>
                    {eventOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="ls-field">
                <label htmlFor="price-min">Price per guest</label>
                <div className="ls-field-pair">
                  <input
                    id="price-min"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(event) => setPriceMin(event.target.value)}
                    aria-describedby="price-help"
                  />
                  <span aria-hidden="true">–</span>
                  <input
                    id="price-max"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(event) => setPriceMax(event.target.value)}
                    aria-label="Maximum price per guest"
                    aria-describedby="price-help"
                  />
                </div>
                <p className="ls-field-help" id="price-help">
                  Only applies to packages priced per guest.
                </p>
              </div>

              {hasAnyFilter && (
                <button
                  type="button"
                  className="ls-btn ls-btn--sm ls-btn--ghost"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
          )}
        </div>
      )}

      <section id="regular-packages" className="ls-band ls-band--page" aria-label="Regular packages">
        <div className="ls-inner">
          {packages.status === "loading" && (
            <div className="ls-card-grid" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((key) => (
                <div className="ls-pkg" key={key}>
                  <div className="ls-skel ls-skel-media" />
                  <div className="ls-pkg-body">
                    <div className="ls-skel ls-skel-line" style={{ width: "60%", height: 18 }} />
                    <div className="ls-skel ls-skel-line" />
                    <div className="ls-skel ls-skel-line" style={{ width: "75%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {packages.status === "error" && (
            <div className="ls-state" role="status">
              <p className="ls-state-title">We couldn't load our packages</p>
              <p>
                Something went wrong on our side. Try again in a moment, or call
                us and we'll walk you through the options for your event.
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

          {/* Only a genuinely empty catalogue: offers above are packages
              too, so publishing one of those is not "nothing published". */}
          {packages.status === "ready" &&
            available.length === 0 &&
            offers.length === 0 && (
            <div className="ls-state">
              <p className="ls-state-title">No packages are published right now</p>
              <p>
                We can still cater your event. Start a booking with your date and
                guest count and we'll build something around it.
              </p>
              <div className="ls-state-actions">
                <button
                  type="button"
                  className="ls-btn ls-btn--sm ls-btn--primary"
                  onClick={() =>
                    navigate("/customer/book", { state: { resetWizard: true } })
                  }
                >
                  Book an Event
                </button>
              </div>
            </div>
          )}

          {packages.status === "ready" && available.length > 0 && (
            <>
              <div className="ls-menu-section-head">
                <h2>Regular Packages</h2>
                <p className="ls-menu-count">
                  {filtered.length} {filtered.length === 1 ? "package" : "packages"}
                  {hasAnyFilter ? " match your filters" : " available"}
                </p>
              </div>

              {filtered.length === 0 ? (
                <div className="ls-state">
                  <p className="ls-state-title">No packages match those filters</p>
                  <p>
                    Try widening them — or start a booking and we'll build a
                    package around your event instead.
                  </p>
                  <div className="ls-state-actions">
                    <button
                      type="button"
                      className="ls-btn ls-btn--sm ls-btn--ghost"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ls-card-grid">
                  {filtered.map((pkg) => {
                    const capacity = capacityLabel(pkg);
                    const service = serviceLabel(pkg);
                    const event = eventTypeForPackage(pkg);
                    const inclusionCount = Array.isArray(pkg.inclusions)
                      ? pkg.inclusions.length
                      : 0;

                    return (
                      <article className="ls-pkg" key={pkg._id || pkg.name}>
                        <div className="ls-pkg-media">
                          {pkg.image_url ? (
                            <img
                              src={pkg.image_url}
                              alt={`${pkg.name} package`}
                              loading="lazy"
                            />
                          ) : (
                            <div className="ls-pkg-media-empty">{pkg.name}</div>
                          )}
                          {event && <span className="ls-pkg-tag">{event}</span>}
                        </div>

                        <div className="ls-pkg-body">
                          <h3>{pkg.name}</h3>
                          {service && <p className="ls-pkg-service">{service}</p>}
                          {pkg.description && (
                            <p className="ls-pkg-desc">{pkg.description}</p>
                          )}

                          <dl className="ls-pkg-facts">
                            <div className="ls-pkg-fact">
                              <dt>Price</dt>
                              <dd>
                                <strong>{priceLabel(pkg)}</strong>
                              </dd>
                            </div>
                            {capacity && (
                              <div className="ls-pkg-fact">
                                <dt>Guests</dt>
                                <dd>
                                  <strong>{capacity}</strong>
                                </dd>
                              </div>
                            )}
                            {inclusionCount > 0 && (
                              <div className="ls-pkg-fact">
                                <dt>Includes</dt>
                                <dd>
                                  <strong>
                                    {inclusionCount}{" "}
                                    {inclusionCount === 1 ? "item" : "items"}
                                  </strong>
                                </dd>
                              </div>
                            )}
                          </dl>

                          <div className="ls-pkg-actions">
                            <button
                              type="button"
                              className="ls-btn ls-btn--primary ls-btn--block"
                              onClick={() => navigate(`/packages/${pkg._id}`)}
                            >
                              View package
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Special Offers ──────────────────────────────────────────
          Below the regular catalogue, in a section of their own. A combo
          is a package with a fixed meal, a fixed guest count and a fixed
          price per pax, so it stays on this page — but it is not mixed
          into the grid above, where a filter for setup size or price per
          guest cannot describe it. */}
      {packages.status === "ready" && offers.length > 0 && (
        <section id="special-offers" className="ls-band ls-band--tint" aria-labelledby="special-offers-title">
          <div className="ls-inner">
            <div className="ls-head">
              <span className="ls-rule" aria-hidden="true" />
              <p className="ls-eyebrow">Special Offers</p>
              <h2 className="ls-title" id="special-offers-title">
                Combo packs, ready to book
              </h2>
              <p className="ls-lede">
                Curated combo meals at a set price per plate. Choose Food Only
                (Pick Up or Delivery) or add full event styling and setup.
              </p>
            </div>

            <div className="ls-card-grid">
              {offers.map((offer) => {
                const perPax = offerPricePerPax(offer);
                const pax = offerGuestCount(offer);
                // The meal itself, grouped by course, straight from the combo's
                // own food list — no dish list is written here.
                const courses = offerFoodByCategory(offer);

                return (
                  <article className="ls-pkg ls-offer" key={offer._id || offer.name}>
                    <div className="ls-pkg-media">
                      {offer.image_url ? (
                        <img
                          src={offer.image_url}
                          alt={`${offer.name} combo pack`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="ls-pkg-media-empty">{offer.name}</div>
                      )}
                      <span className="ls-offer-tag">Combo pack</span>
                    </div>

                    <div className="ls-pkg-body">
                      <h3>{offer.name}</h3>

                      {/* Nothing is printed when the rate is unset: a ₱0
                          reads as a price, and no one set one. */}
                      {perPax > 0 && (
                        <p className="ls-offer-price">
                          <strong>{peso(perPax)}</strong>
                          <span>per pax</span>
                        </p>
                      )}

                      <div className="ls-offer-chips">
                        {pax > 0 && (
                          <span className="ls-offer-chip">{pax} guests</span>
                        )}
                        {offer.badge_text && (
                          <span className="ls-offer-chip">{offer.badge_text}</span>
                        )}
                      </div>

                      {offer.description && (
                        <p className="ls-pkg-desc">{offer.description}</p>
                      )}

                      {/* Grouped by course, so a seven-dish combo reads as a
                          meal rather than as a list. */}
                      {courses.length > 0 && (
                        <ul className="ls-offer-includes">
                          {courses.map((course) => (
                            <li key={course.category}>
                              <strong>{course.category}</strong> ·{" "}
                              {course.items.join(", ")}
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="ls-pkg-actions">
                        <button
                          type="button"
                          className="ls-btn ls-btn--primary ls-btn--block"
                          onClick={() => navigate(`/packages/${offer._id}`)}
                        >
                          View combo
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="ls-band ls-band--ink" aria-labelledby="packages-bridge-title">
        <div className="ls-inner ls-bridge">
          <div>
            <span className="ls-rule" aria-hidden="true" />
            <h2 className="ls-title" id="packages-bridge-title">
              Need something the packages don't cover?
            </h2>
            <p className="ls-lede">
              Start a booking and build it yourself — choose your own dishes,
              setup, and add-ons — or send us the details and we'll quote for it.
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
              Build your own
            </button>
            <button
              type="button"
              className="ls-btn ls-btn--light"
              onClick={() => navigate("/menu")}
            >
              Browse the menu
            </button>
          </div>
        </div>
      </section>

      <CustomerFooter businessInfo={businessInfo} />
    </CustomerLayout>
  );
}
