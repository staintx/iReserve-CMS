import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import CustomerFooter from "../../components/layout/CustomerFooter";
import useBusinessInfo, { DEFAULT_BUSINESS_INFO } from "../../hooks/useBusinessInfo";
import { CustomerAPI } from "../../api/customer";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  capacityLabel,
  eventTypeForPackage,
  groupInclusions,
  guestRange,
  perGuestPrice,
  peso,
  priceLabel,
  serviceLabel,
  serviceTypeForPackage,
} from "../../lib/packageDisplay";

export default function PackageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const businessInfo = useBusinessInfo();
  // The result is stamped with the id it belongs to, so navigating between
  // packages shows a loading state until the new one lands instead of briefly
  // rendering the previous package's content under the new URL.
  const [result, setResult] = useState({ id: null, status: "loading", data: null });
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const fetchPackage = useCallback(
    () =>
      CustomerAPI.getPackageById(id)
        .then((res) => {
          if (!res?.data) return { status: "error", data: null };
          if (res.data.available === false) {
            return { status: "unavailable", data: null };
          }
          return { status: "ready", data: res.data };
        })
        .catch((error) => ({
          // A 404 means the package is gone, which is a different message from
          // "our server had a problem" — and neither should be a silent
          // redirect that leaves the customer wondering what happened.
          status: error?.response?.status === 404 ? "missing" : "error",
          data: null,
        })),
    [id],
  );

  useEffect(() => {
    let cancelled = false;
    fetchPackage().then((next) => {
      if (!cancelled) setResult({ ...next, id });
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPackage, id]);

  const pkg = result.id === id ? result : { status: "loading", data: null };

  const retry = () => {
    setResult({ id: null, status: "loading", data: null });
    fetchPackage().then((next) => setResult({ ...next, id }));
  };

  const data = pkg.data;

  const gallery = useMemo(
    () => (Array.isArray(data?.gallery) ? data.gallery.filter(Boolean) : []),
    [data],
  );

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const stepLightbox = useCallback(
    (delta) => {
      setLightboxIndex((current) => {
        if (current === null || gallery.length === 0) return current;
        return (current + delta + gallery.length) % gallery.length;
      });
    },
    [gallery.length],
  );

  useEffect(() => {
    if (lightboxIndex === null) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") stepLightbox(-1);
      if (event.key === "ArrowRight") stepLightbox(1);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxIndex, closeLightbox, stepLightbox]);

  const contactNumber =
    businessInfo.contact_number || DEFAULT_BUSINESS_INFO.contact_number;
  const contactEmail = businessInfo.email || DEFAULT_BUSINESS_INFO.email;

  const bookingState = data
    ? {
        resetWizard: true,
        initialStep: 0,
        eventType: eventTypeForPackage(data),
        serviceType: serviceTypeForPackage(data),
        packageId: data._id,
        packageName: data.name,
        packagePrice: data.setup_price || perGuestPrice(data) || 0,
        guestMin: data.guest_min || null,
        guestMax: data.guest_max || null,
      }
    : null;

  const scaffoldOptions = Array.isArray(data?.scaffold_size_options)
    ? data.scaffold_size_options.filter(
        (option) => option?.label || option?.width_ft || option?.price,
      )
    : [];

  const inclusionGroups = groupInclusions(data?.inclusions);
  const addOns = Array.isArray(data?.add_ons)
    ? data.add_ons.filter((item) => item?.name || typeof item === "string")
    : [];

  const [guestMin, guestMax] = data ? guestRange(data) : [null, null];
  const capacity = data ? capacityLabel(data) : null;
  const service = data ? serviceLabel(data) : null;
  const event = data ? eventTypeForPackage(data) : "";
  const longDescription = data?.fullDescription || data?.description;

  const renderState = (title, message, actions) => (
    <section className="ls-band ls-band--page">
      <div className="ls-inner">
        <div className="ls-state" role="status">
          <p className="ls-state-title">{title}</p>
          <p>{message}</p>
          <div className="ls-state-actions">{actions}</div>
        </div>
      </div>
    </section>
  );

  const browseButton = (
    <button
      type="button"
      className="ls-btn ls-btn--sm ls-btn--ghost"
      onClick={() => navigate("/packages")}
    >
      Browse all packages
    </button>
  );

  const callButton = (
    <a
      className="ls-btn ls-btn--sm ls-btn--ghost"
      href={`tel:${contactNumber.replace(/\s+/g, "")}`}
    >
      Call {contactNumber}
    </a>
  );

  return (
    <CustomerLayout marketing contentClassName="ls-main">
      {pkg.status === "loading" && (
        <div className="ls-pagehead">
          <div className="ls-inner ls-detail-head" aria-hidden="true">
            <div>
              <div className="ls-skel ls-skel-line" style={{ width: "30%" }} />
              <div className="ls-skel ls-skel-line" style={{ width: "70%", height: 34 }} />
              <div className="ls-skel ls-skel-line" />
              <div className="ls-skel ls-skel-line" style={{ width: "80%" }} />
            </div>
            <div className="ls-skel ls-skel-media" />
          </div>
        </div>
      )}

      {pkg.status === "error" &&
        renderState(
          "We couldn't load this package",
          "Something went wrong on our side. Try again in a moment, or call us and we'll tell you everything this package includes.",
          <>
            <button type="button" className="ls-btn ls-btn--sm ls-btn--ghost" onClick={retry}>
              Try again
            </button>
            {callButton}
          </>,
        )}

      {pkg.status === "missing" &&
        renderState(
          "We couldn't find that package",
          "It may have been renamed or taken down. Have a look at what we're offering now.",
          <>
            {browseButton}
            {callButton}
          </>,
        )}

      {pkg.status === "unavailable" &&
        renderState(
          "This package isn't available right now",
          "We're not taking bookings on it at the moment. Our other packages are still open, or call us and we'll work something out for your date.",
          <>
            {browseButton}
            {callButton}
          </>,
        )}

      {pkg.status === "ready" && data && (
        <>
          {/* ── Above the fold: the questions a customer arrives with ── */}
          <div className="ls-pagehead">
            <div className="ls-inner">
              <button
                type="button"
                className="ls-backlink"
                onClick={() => navigate("/packages")}
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Back to packages
              </button>

              <div className="ls-detail-head">
                <div>
                  <p className="ls-eyebrow">
                    {[service, event].filter(Boolean).join(" · ") || "Catering package"}
                  </p>
                  <h1>{data.name}</h1>
                  {data.description && <p className="ls-lede">{data.description}</p>}

                  <dl className="ls-detail-facts">
                    <div>
                      <dt>Price</dt>
                      <dd>{priceLabel(data)}</dd>
                    </div>
                    {capacity && (
                      <div>
                        <dt>Guests</dt>
                        <dd>{capacity}</dd>
                      </div>
                    )}
                    {inclusionGroups.length > 0 && (
                      <div>
                        <dt>Includes</dt>
                        <dd>
                          {data.inclusions.length}{" "}
                          {data.inclusions.length === 1 ? "item" : "items"}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {/* Sizes live with the rest of what a customer needs before
                      they decide — price, guests, includes — rather than
                      buried in the body. Price is intentionally left off each
                      row: the Price fact above already gives the starting
                      price, and the exact quote comes from the booking flow. */}
                  {scaffoldOptions.length > 0 && (
                    <div className="ls-detail-sizes">
                      <p className="ls-detail-sizes-label">Available sizes</p>
                      <div className="ls-table-scroll">
                        <table className="ls-table">
                          <thead>
                            <tr>
                              <th scope="col">Size</th>
                              <th scope="col">Area</th>
                              <th scope="col">Guests</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scaffoldOptions.map((option, index) => {
                              const dims =
                                option.width_ft && option.length_ft
                                  ? `${option.width_ft} × ${option.length_ft} ft`
                                  : "—";
                              const guests =
                                option.guest_min && option.guest_max
                                  ? `${option.guest_min}–${option.guest_max}`
                                  : option.guest_max
                                    ? `Up to ${option.guest_max}`
                                    : "—";

                              return (
                                <tr key={option._id || `${option.label}-${index}`}>
                                  <th scope="row">{option.label || `Option ${index + 1}`}</th>
                                  <td>{dims}</td>
                                  <td>{guests}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="ls-detail-actions">
                    <button
                      type="button"
                      className="ls-btn ls-btn--primary"
                      onClick={() =>
                        navigate("/customer/book", { state: bookingState })
                      }
                    >
                      Book this package
                    </button>
                    <button
                      type="button"
                      className="ls-btn ls-btn--ghost"
                      onClick={() =>
                        navigate("/customer/book", { state: bookingState })
                      }
                    >
                      Request a quote
                    </button>
                  </div>
                </div>

                {/* Media supports the copy rather than pushing it down the
                    page, and the layout simply closes up when there is none. */}
                {data.image_url && (
                  <div className="ls-detail-media">
                    <img src={data.image_url} alt={`${data.name} package`} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <section className="ls-band ls-band--page">
            <div className="ls-inner ls-detail-body">
              {longDescription && longDescription !== data.description && (
                <section className="ls-detail-section" aria-labelledby="about-title">
                  <h2 id="about-title">About this package</h2>
                  <p className="ls-detail-prose">{longDescription}</p>
                </section>
              )}

              {inclusionGroups.length > 0 && (
                <section className="ls-detail-section" aria-labelledby="includes-title">
                  <h2 id="includes-title">What this package includes</h2>
                  {inclusionGroups.map((group, groupIndex) => (
                    <div className="ls-inclusion-group" key={group.category || groupIndex}>
                      {group.category && <h3>{group.category}</h3>}
                      <ul className="ls-inclusion-list">
                        {group.items.map((item, index) => (
                          <li key={`${item.name}-${index}`}>
                            <span className="ls-inclusion-check" aria-hidden="true">
                              <Check size={12} strokeWidth={3} />
                            </span>
                            <span>
                              {item.name}
                              {item.qty && (
                                <span className="ls-inclusion-qty"> × {item.qty}</span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </section>
              )}

              {addOns.length > 0 && (
                <section className="ls-detail-section" aria-labelledby="addons-title">
                  <h2 id="addons-title">Optional add-ons</h2>
                  <p className="ls-detail-prose">
                    Add any of these while you book — they're charged on top of
                    the package.
                  </p>
                  <ul className="ls-addon-list">
                    {addOns.map((item, index) => {
                      const name = typeof item === "string" ? item : item.name;
                      const price = typeof item === "string" ? null : peso(item.price);
                      return (
                        <li key={`${name}-${index}`}>
                          <span>{name}</span>
                          {price && <strong>{price}</strong>}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <section className="ls-detail-section" aria-labelledby="custom-title">
                <h2 id="custom-title">Can you change it?</h2>
                <p className="ls-detail-prose">
                  Yes. While you book you can set your guest count
                  {guestMin && guestMax ? ` between ${guestMin} and ${guestMax}` : ""},
                  choose your dishes, and add extras. If you need something this
                  package doesn't cover, send us the details and we'll quote for
                  it instead.
                </p>
              </section>

              {gallery.length > 0 && (
                <section className="ls-detail-section" aria-labelledby="gallery-title">
                  <h2 id="gallery-title">Photos from this package</h2>
                  <div className="ls-detail-gallery">
                    {gallery.map((imageUrl, index) => (
                      <button
                        type="button"
                        key={imageUrl}
                        className="ls-gallery-item"
                        onClick={() => setLightboxIndex(index)}
                        aria-label={`View photo ${index + 1} of ${gallery.length}`}
                      >
                        <img
                          src={imageUrl}
                          alt={`${data.name} — photo ${index + 1}`}
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </section>

          <section className="ls-band ls-band--ink" aria-labelledby="book-title">
            <div className="ls-inner ls-bridge">
              <div>
                <span className="ls-rule" aria-hidden="true" />
                <h2 className="ls-title" id="book-title">
                  Book {data.name}
                </h2>
                <p className="ls-lede">
                  Give us your date and guest count and we'll confirm whether
                  it's free. Prefer to talk it through first? Call{" "}
                  <a href={`tel:${contactNumber.replace(/\s+/g, "")}`}>
                    {contactNumber}
                  </a>{" "}
                  or email{" "}
                  <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
                </p>
              </div>
              <div className="ls-bridge-actions">
                <button
                  type="button"
                  className="ls-btn ls-btn--onink"
                  onClick={() => navigate("/customer/book", { state: bookingState })}
                >
                  Book this package
                </button>
                <button
                  type="button"
                  className="ls-btn ls-btn--light"
                  onClick={() =>
                    navigate("/customer/book", { state: bookingState })
                  }
                >
                  Request a quote
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      <CustomerFooter businessInfo={businessInfo} />

      {lightboxIndex !== null && gallery[lightboxIndex] && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Package photo ${lightboxIndex + 1} of ${gallery.length}`}
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

          {gallery.length > 1 && (
            <button
              className="lightbox-nav lightbox-nav-prev"
              type="button"
              aria-label="Previous photo"
              onClick={(event_) => {
                event_.stopPropagation();
                stepLightbox(-1);
              }}
            >
              <ChevronLeft size={28} aria-hidden="true" />
            </button>
          )}

          <img
            src={gallery[lightboxIndex]}
            alt={`${data?.name || "Package"} — photo ${lightboxIndex + 1}`}
            className="lightbox-image"
            onClick={(event_) => event_.stopPropagation()}
          />

          {gallery.length > 1 && (
            <button
              className="lightbox-nav lightbox-nav-next"
              type="button"
              aria-label="Next photo"
              onClick={(event_) => {
                event_.stopPropagation();
                stepLightbox(1);
              }}
            >
              <ChevronRight size={28} aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </CustomerLayout>
  );
}
