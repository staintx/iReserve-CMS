import { useCallback, useEffect, useMemo, useState } from "react";
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

// Order the service filters the way the booking flow presents them.
const SERVICE_ORDER = ["Food Only", "Event Setup Only", "Food + Event Setup"];

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

  const available = useMemo(
    () => packages.data.filter((pkg) => pkg?.available !== false),
    [packages.data],
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

  const contactNumber =
    businessInfo.contact_number || DEFAULT_BUSINESS_INFO.contact_number;

  return (
    <CustomerLayout marketing contentClassName="ls-main">
      <div className="ls-pagehead">
        <div className="ls-inner">
          <span className="ls-rule" aria-hidden="true" />
          <p className="ls-eyebrow">Packages</p>
          <h1>Choose a catering package</h1>
          <p className="ls-lede">
            Each package sets what's covered — food, event setup, or both — the
            guest range it's built for, and how it's priced. Open one to see
            everything it includes.
          </p>
        </div>
      </div>

      {packages.status === "ready" && available.length > 0 && (
        <div className="ls-filterbar">
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
        </div>
      )}

      <section className="ls-band ls-band--page" aria-label="Catering packages">
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

          {packages.status === "ready" && available.length === 0 && (
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
                <h2>
                  {filtered.length} {filtered.length === 1 ? "package" : "packages"}
                  {hasAnyFilter ? " match your filters" : " available"}
                </h2>
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
