import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import CustomerFooter from "../../components/layout/CustomerFooter";
import useBusinessInfo, { DEFAULT_BUSINESS_INFO } from "../../hooks/useBusinessInfo";
import { CustomerAPI } from "../../api/customer";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, X, Sparkles, Utensils } from "lucide-react";
import {
  capacityLabel,
  eventTypeForPackage,
  groupInclusions,
  guestRange,
  perGuestPrice,
  priceLabel,
  serviceLabel,
  serviceTypeForPackage,
} from "../../lib/packageDisplay";
import {
  isSpecialOffer,
  offerGuestCount,
  offerPricePerPax,
  offerBaseFoodPrice,
  offerFoodByCategory,
  offerInclusions,
} from "../../lib/specialOffers";
import { SERVICE_TYPES } from "./booking/lib/bookingRules";

const peso = (amount) =>
  "₱" + Number(amount || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 });

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
    window.scrollTo(0, 0);
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

  const offer = isSpecialOffer(data);
  const perPax = offer ? offerPricePerPax(data) : 0;
  const offerPax = offer ? offerGuestCount(data) : 0;
  const offerCourses = offer ? offerFoodByCategory(data) : [];

  const splitCourses = useMemo(() => {
    if (!offerCourses || offerCourses.length === 0) return { left: [], right: [] };
    if (offerCourses.length === 1) return { left: offerCourses, right: [] };

    const left = [];
    const right = [];
    let leftWeight = 0;
    let rightWeight = 0;

    for (const course of offerCourses) {
      const weight = 3 + (course.items?.length || 0);
      if (leftWeight <= rightWeight) {
        left.push(course);
        leftWeight += weight;
      } else {
        right.push(course);
        rightWeight += weight;
      }
    }
    return { left, right };
  }, [offerCourses]);

  const renderCourseCard = (course, idxKey) => {
    const isLargeCategory = course.items.length > 8;
    return (
      <div
        key={course.category || idxKey}
        className="bg-white border border-gray-200/90 rounded-lg p-5 shadow-xs transition-all duration-200 hover:shadow-sm hover:border-amber-300"
      >
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <h4 className="font-bold text-sm tracking-wider text-gray-900 uppercase">
            {course.category || "Included Items"}
          </h4>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
            {course.items.length} {course.items.length === 1 ? "item" : "items"}
          </span>
        </div>

        <ul
          className={`grid gap-2.5 ${
            isLargeCategory
              ? "grid-cols-1 sm:grid-cols-2"
              : "grid-cols-1 sm:grid-cols-2"
          }`}
        >
          {course.items.map((item, itemIdx) => (
            <li
              key={itemIdx}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-gray-50/80 border border-gray-100 text-sm font-medium text-gray-800 transition-colors hover:bg-amber-50/40 hover:border-amber-200"
            >
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const bookingState = data
    ? {
        resetWizard: true,
        initialStep: 0,
        eventType: eventTypeForPackage(data),
        // An offer always includes food, so it enters the wizard as full
        // service rather than as a setup package the customer is then asked
        // whether they want catering with.
        serviceType: offer
          ? SERVICE_TYPES.FULL_SERVICE
          : serviceTypeForPackage(data),
        packageId: data._id,
        packageName: data.name,
        packagePrice: offer
          ? perPax
          : data.setup_price || perGuestPrice(data) || 0,
        // A combo allows flexible guest count input starting from 1 or min pax
        guestMin: offer ? data.guest_min || 1 : data.guest_min || null,
        guestMax: offer ? data.guest_max || 300 : data.guest_max || null,
      }
    : null;

  // Sizes are a regular package's: they describe the event space it builds.
  // A combo is food, so it has none to show — and showing an empty table, or
  // one inherited from a record that used to be a package, would promise a
  // set-up the combo does not include.
  const scaffoldOptions =
    !offer && Array.isArray(data?.scaffold_size_options)
      ? data.scaffold_size_options.filter(
          (option) => option?.label || option?.width_ft || option?.price,
        )
      : [];

  // A package's inclusions carry the inventory class they came from and are
  // grouped by it; a combo's are plain lines the admin typed, so they are
  // listed as they were written.
  const inclusionGroups = offer ? [] : groupInclusions(data?.inclusions);

  const splitInclusionGroups = useMemo(() => {
    const left = [];
    const right = [];
    let leftWeight = 0;
    let rightWeight = 0;

    for (const group of inclusionGroups) {
      const weight = 3 + (group.items?.length || 0);
      if (leftWeight <= rightWeight) {
        left.push(group);
        leftWeight += weight;
      } else {
        right.push(group);
        rightWeight += weight;
      }
    }
    return { left, right };
  }, [inclusionGroups]);

  const renderInclusionGroupCard = (group, idxKey) => {
    return (
      <div
        key={group.category || idxKey}
        className="bg-white border border-gray-200/90 rounded-lg p-5 shadow-xs transition-all duration-200 hover:shadow-sm hover:border-blue-300"
      >
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <h3 className="font-bold text-sm tracking-wider text-gray-900 uppercase">
            {group.category || "Included Items"}
          </h3>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60">
            {group.items.length} {group.items.length === 1 ? "item" : "items"}
          </span>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {group.items.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-gray-50/80 border border-gray-100 text-sm font-medium text-gray-800 transition-colors hover:bg-blue-50/30 hover:border-blue-200"
            >
              <span className="ls-inclusion-check shrink-0" aria-hidden="true">
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="leading-snug">
                {item.name}
                {item.qty && (
                  <span className="text-xs text-gray-500 font-normal ml-1">
                    ({item.qty})
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const comboInclusions = offer ? offerInclusions(data) : [];
  // Add-ons are sold alongside a regular package. A combo has none — the same
  // reason it has no sizes.
  const addOns = !offer && Array.isArray(data?.add_ons)
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
                    {offer ? "Special Offer" : ([service, event].filter(Boolean).join(" · ") || "Catering package")}
                  </p>
                  <h1>{data.name}</h1>
                  {data.description && <p className="ls-lede">{data.description}</p>}

                  {offer && data.badge_text && (
                    <div className="ls-offer-chips" style={{ marginBottom: 4 }}>
                      <span className="ls-offer-chip">{data.badge_text}</span>
                    </div>
                  )}

                  <dl className="ls-detail-facts">
                    <div>
                      <dt>Price</dt>
                      <dd>
                        {offer && perPax > 0
                          ? `${peso(perPax)} per plate / pax`
                          : priceLabel(data)}
                      </dd>
                    </div>
                    {!offer && capacity && (
                      <div>
                        <dt>Guests</dt>
                        <dd>{capacity}</dd>
                      </div>
                    )}
                    {!offer && (inclusionGroups.length > 0 || comboInclusions.length > 0) && (
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
                              <th scope="col">Set-up</th>
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
                                  {/* What a size costs is a quotation
                                      decision, so this says whether the package
                                      covers it — never a number. */}
                                  <td>
                                    {option.free_setup
                                      ? "Free with this package"
                                      : "Priced on quotation"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="ls-detail-actions flex-wrap gap-2">
                    <button
                      type="button"
                      className="ls-btn ls-btn--primary"
                      onClick={() =>
                        navigate("/customer/book", { state: bookingState })
                      }
                    >
                      {offer ? "Book this combo" : "Book this package"}
                    </button>
                    <button
                      type="button"
                      className="ls-btn ls-btn--ghost"
                      onClick={() =>
                        navigate("/customer/book", { state: { resetWizard: true } })
                      }
                    >
                      Request Custom
                    </button>
                    <button
                      type="button"
                      className="ls-btn inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("open-zelle-chat", {
                          detail: {
                            tab: "zelle",
                            prompt: `Can you tell me more about ${data.name}, its inclusions, and budget suitability?`
                          }
                        }));
                      }}
                    >
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Ask Zelle AI
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

              {/* The meal itself, grouped by course/category, from the combo's own food list */}
              {offerCourses.length > 0 && (
                <div className="mt-10 pt-8 border-t border-gray-200/80 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                        <Utensils className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-gray-900 uppercase tracking-wider">
                          What This Combo Serves
                        </h3>
                        <p className="text-xs text-gray-500">
                          Included dishes & choices organized by course category
                        </p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200/80 shrink-0 self-start sm:self-auto shadow-xs">
                      <span>Choose 1 item from each category.</span>
                    </div>
                  </div>

                  {/* Mobile single-column layout */}
                  <div className="space-y-5 md:hidden">
                    {offerCourses.map((course, idx) => renderCourseCard(course, idx))}
                  </div>

                  {/* Desktop & Tablet balanced two-column layout */}
                  <div className="hidden md:grid md:grid-cols-2 gap-5 items-start">
                    <div className="space-y-5">
                      {splitCourses.left.map((course, idx) =>
                        renderCourseCard(course, `left-${idx}`),
                      )}
                    </div>
                    <div className="space-y-5">
                      {splitCourses.right.map((course, idx) =>
                        renderCourseCard(course, `right-${idx}`),
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <section className="ls-band ls-band--page">
            <div className="ls-inner ls-detail-body">
              {comboInclusions.length > 0 && (
                <section className="ls-detail-section" aria-labelledby="combo-includes-title">
                  <h2 id="combo-includes-title">What this combo includes</h2>
                  <ul className="ls-inclusion-list">
                    {comboInclusions.map((item, index) => (
                      <li key={`${item}-${index}`}>
                        <span className="ls-inclusion-check" aria-hidden="true">
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {inclusionGroups.length > 0 && (
                <section className="ls-detail-section" aria-labelledby="includes-title">
                  <h2 id="includes-title" className="mb-6">What this package includes</h2>

                  {inclusionGroups.length === 1 ? (
                    <div className="space-y-5">
                      {renderInclusionGroupCard(inclusionGroups[0], "single")}
                    </div>
                  ) : (
                    <>
                      {/* Mobile single-column layout */}
                      <div className="space-y-5 md:hidden">
                        {inclusionGroups.map((group, idx) =>
                          renderInclusionGroupCard(group, `mob-${idx}`),
                        )}
                      </div>

                      {/* Desktop & Tablet balanced two-column layout */}
                      <div className="hidden md:grid md:grid-cols-2 gap-5 items-start">
                        <div className="space-y-5">
                          {splitInclusionGroups.left.map((group, idx) =>
                            renderInclusionGroupCard(group, `left-${idx}`),
                          )}
                        </div>
                        <div className="space-y-5">
                          {splitInclusionGroups.right.map((group, idx) =>
                            renderInclusionGroupCard(group, `right-${idx}`),
                          )}
                        </div>
                      </div>
                    </>
                  )}
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
                      return (
                        <li key={`${name}-${index}`}>
                          <span>{name}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
                {longDescription && (
                  <section className="ls-detail-section" aria-labelledby="about-title">
                    <h2 id="about-title">
                      {offer ? "About this combo" : "About this package"}
                    </h2>
                    <p className="ls-detail-prose">{longDescription}</p>
                  </section>
                )}

                <section className="ls-detail-section" aria-labelledby="custom-title">
                  <h2 id="custom-title">Can you change it?</h2>
                  <p className="ls-detail-prose">
                    Yes. While you book you can set your guest count, choose
                    your dishes, and add extras. If you need something this
                    package doesn't cover, send us the details and we'll quote
                    for it instead.
                  </p>
                </section>
              </div>

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
                  {offer ? "Book this combo" : "Book this package"}
                </button>
                <button
                  type="button"
                  className="ls-btn ls-btn--light"
                  onClick={() =>
                    navigate("/customer/book", { state: { resetWizard: true } })
                  }
                >
                  Request Custom
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
