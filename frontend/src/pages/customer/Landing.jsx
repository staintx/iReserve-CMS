import CustomerLayout from "../../components/layout/CustomerLayout";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CustomerAPI } from "../../api/customer";
import CustomerFooter from "../../components/layout/CustomerFooter";
import { DEFAULT_BUSINESS_INFO } from "../../hooks/useBusinessInfo";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import {
  capacityLabel,
  positiveNumbers,
  priceLabel,
} from "../../lib/packageDisplay";
import {
  isSpecialOffer,
  offerGuestCount,
  offerPricePerPax,
  offerFoodItems,
} from "../../lib/specialOffers";

const peso = (amount) =>
  "₱" + Number(amount || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 });

// One large tile plus four small ones tiles the feature grid exactly.
const GALLERY_PREVIEW_COUNT = 5;

const HERO_IMAGE_URL =
  "https://images.pexels.com/photos/28736727/pexels-photo-28736727.jpeg?auto=compress&cs=tinysrgb&w=1600";

// Mirrors what the booking flow actually does: the wizard submits an inquiry
// (CustomerAPI.submitInquiry), an admin prices it and returns a quotation, and
// the date is held once that is accepted and the deposit is paid. Saying
// "book" and meaning "request a quote" was the biggest expectation gap on the
// page.
const BOOKING_STEPS = [
  {
    title: "Tell us about the event",
    text: "Date, guest count, venue, and what you want on the table.",
  },
  {
    title: "Choose food and setup",
    text: "Pick a package or build your own from the dishes and add-ons available.",
  },
  {
    title: "We send your quote",
    text: "We price everything and email you a quotation to review — no payment yet.",
  },
  {
    title: "Accept and we handle the day",
    text: "Your deposit holds the date. Delivery, setup, service, and teardown are ours.",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();

  const [content, setContent] = useState({
    packages: { status: "loading", data: [] },
    menu: { status: "loading", data: [] },
    gallery: { status: "loading", data: [] },
    reviews: { status: "loading", data: [] },
  });
  const [businessInfo, setBusinessInfo] = useState(DEFAULT_BUSINESS_INFO);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Re-scan for reveal targets whenever a section swaps out of its loading
  // state, since those cards do not exist on the first pass.
  const motionSignal = `${content.packages.status}|${content.menu.status}|${content.gallery.status}|${content.reviews.status}`;
  const revealScope = useRevealOnScroll(motionSignal);

  // Resolves to a patch for `content` — every section reports its own outcome,
  // so one failing endpoint can't take the rest of the page down with it.
  // Deliberately free of setState: callers apply the patch, which keeps the
  // mount effect from writing state synchronously.
  const fetchContent = useCallback(async (keys) => {
    const requested = keys ?? ["packages", "menu", "gallery", "reviews"];

    const fetchers = {
      packages: CustomerAPI.getPackages,
      menu: CustomerAPI.getMenu,
      gallery: CustomerAPI.getGallery,
      reviews: CustomerAPI.getRatings,
    };

    const results = await Promise.allSettled(
      requested.map((key) => fetchers[key]()),
    );

    const patch = {};
    requested.forEach((key, index) => {
      const result = results[index];
      if (result.status === "fulfilled") {
        patch[key] = {
          status: "ready",
          data: Array.isArray(result.value?.data) ? result.value.data : [],
        };
      } else {
        patch[key] = { status: "error", data: [] };
      }
    });
    return patch;
  }, []);

  const applyPatch = useCallback((patch) => {
    setContent((prev) => ({ ...prev, ...patch }));
  }, []);

  const retryContent = useCallback(
    (keys) => {
      setContent((prev) => {
        const next = { ...prev };
        keys.forEach((key) => {
          next[key] = { ...prev[key], status: "loading" };
        });
        return next;
      });
      fetchContent(keys).then(applyPatch);
    },
    [fetchContent, applyPatch],
  );

  useEffect(() => {
    let cancelled = false;
    const apply = (patch) => {
      if (!cancelled) applyPatch(patch);
    };

    fetchContent().then(apply);

    // Business info has sensible defaults, so a failure here is not worth a
    // visible error state — the footer simply keeps the fallback values.
    CustomerAPI.getBusinessInfo()
      .then((res) => {
        if (cancelled || !res?.data) return;
        setBusinessInfo((prev) => ({ ...prev, ...res.data }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [fetchContent, applyPatch]);

  const scrollToSection = useCallback((sectionId) => {
    if (sectionId === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const rawHash = (location.hash || "").replace("#", "").trim();
    if (!rawHash) return;

    // Older links pointed at sections that no longer exist on their own.
    const legacyMap = { about: "contact", testimonials: "contact", foods: "menu" };
    const sectionId = legacyMap[rawHash] || rawHash;

    const timer = window.setTimeout(() => scrollToSection(sectionId), 0);
    return () => window.clearTimeout(timer);
  }, [location.hash, scrollToSection]);

  const galleryItems = content.gallery.data;

  useEffect(() => {
    if (lightboxIndex === null) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setLightboxIndex(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex]);

  const goToBooking = (payload = {}) => {
    navigate("/customer/book", { state: { resetWizard: true, ...payload } });
  };

  const publishedPackages = useMemo(
    () => content.packages.data.filter((pkg) => pkg?.available !== false),
    [content.packages.data],
  );

  const availablePackages = useMemo(
    () => publishedPackages.filter((pkg) => !isSpecialOffer(pkg)),
    [publishedPackages],
  );

  const featuredPackages = useMemo(() => {
    const flagged = availablePackages.filter((pkg) => pkg?.featured === true);
    return (flagged.length > 0 ? flagged : availablePackages).slice(0, 3);
  }, [availablePackages]);

  /**
   * The home page promotes one offer, not the catalogue.
   *
   * A visitor here is deciding whether to look further, so a whole band of
   * offers competes with the packages instead of drawing anyone into them. One
   * card, slotted between two regular packages, is a promotion; the full set
   * lives on the Packages page.
   *
   * A flagged (`featured`) offer wins, otherwise the first published one.
   */
  const promotedOffer = useMemo(() => {
    const offers = publishedPackages.filter(isSpecialOffer);
    return offers.find((offer) => offer?.featured === true) || offers[0] || null;
  }, [publishedPackages]);

  /**
   * The three cards the packages band renders, with the promoted offer sitting
   * in the middle — Regular · Special · Regular — so it reads as one of the
   * things on offer rather than an advert bolted to the side.
   *
   * With only one package to show it goes after it rather than orphaning a
   * lone offer at the front.
   */
  const packageShowcase = useMemo(() => {
    if (!promotedOffer) return featuredPackages;
    const cards = [...featuredPackages];
    const middle = cards.length >= 2 ? 1 : cards.length;
    cards.splice(middle, 0, promotedOffer);
    return cards.slice(0, 3);
  }, [featuredPackages, promotedOffer]);

  const availableMenu = useMemo(
    () => content.menu.data.filter((item) => item?.available !== false),
    [content.menu.data],
  );

  // Hero proof points, all derived from live data — never rendered when the
  // underlying numbers aren't there.
  const heroFacts = useMemo(() => {
    const facts = [];

    if (availablePackages.length > 0) {
      facts.push({
        value: String(availablePackages.length),
        label: availablePackages.length === 1 ? "package" : "packages to choose from",
      });
    }

    const mins = positiveNumbers(
      availablePackages.flatMap((pkg) => [
        pkg?.guest_min,
        ...(pkg?.scaffold_size_options || []).map((o) => o?.guest_min),
      ]),
    );
    const maxs = positiveNumbers(
      availablePackages.flatMap((pkg) => [
        pkg?.guest_max,
        ...(pkg?.scaffold_size_options || []).map((o) => o?.guest_max),
      ]),
    );
    if (mins.length && maxs.length) {
      facts.push({
        value: `${Math.min(...mins)}–${Math.max(...maxs)}`,
        label: "guests catered for",
      });
    }

    const eventTypes = [
      ...new Set(availablePackages.map((pkg) => pkg?.event_type).filter(Boolean)),
    ];
    if (eventTypes.length > 0) {
      facts.push({
        value: String(eventTypes.length),
        label: `event types — ${eventTypes.slice(0, 3).join(", ").toLowerCase()}`,
      });
    }

    return facts;
  }, [availablePackages]);

  const reviews = content.reviews.data;

  const contactNumber = businessInfo.contact_number || DEFAULT_BUSINESS_INFO.contact_number;
  const contactEmail = businessInfo.email || DEFAULT_BUSINESS_INFO.email;
  const hours = businessInfo.hours || DEFAULT_BUSINESS_INFO.hours;

  const renderError = (title, message, onRetry) => (
    <div className="ls-state" role="status">
      <p className="ls-state-title">{title}</p>
      <p>{message}</p>
      <div className="ls-state-actions">
        <button type="button" className="ls-btn ls-btn--sm ls-btn--ghost" onClick={onRetry}>
          Try again
        </button>
        <a className="ls-btn ls-btn--sm ls-btn--ghost" href={`tel:${contactNumber.replace(/\s+/g, "")}`}>
          Call {contactNumber}
        </a>
      </div>
    </div>
  );

  return (
    <CustomerLayout
      marketing
      overlayHeader
      contentClassName="ls-main"
      mainRef={revealScope}
    >
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="ls-hero ls-hero--under-header" aria-labelledby="hero-title">
        <div className="ls-hero-media" aria-hidden="true">
          <img src={HERO_IMAGE_URL} alt="" fetchPriority="high" />
        </div>
        <div className="ls-hero-scrim" aria-hidden="true" />

        <div className="ls-inner ls-hero-inner">
          <p className="ls-hero-eyebrow">Catering &amp; event setup</p>
          <h1 id="hero-title">
            Catering and event setup for weddings, birthdays, and corporate events
          </h1>
          <p className="ls-hero-sub">
            Choose a ready-made package or build your own — pick the food, set your
            guest count, and reserve your date online.
          </p>

          <div className="ls-hero-actions">
            <button type="button" className="ls-btn ls-btn--primary" onClick={() => navigate("/packages")}>
              Book Now
            </button>
            <button type="button" className="ls-btn ls-btn--light" onClick={() => goToBooking()}>
              Request Custom Booking
            </button>
          </div>

          {heroFacts.length > 0 && (
            <dl className="ls-hero-facts">
              {heroFacts.map((fact) => (
                <div className="ls-hero-fact" key={fact.label}>
                  <dt className="sr-only">{fact.label}</dt>
                  <dd>
                    <strong>{fact.value}</strong>
                    {fact.label}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* ── Packages ───────────────────────────────────────── */}
      <section id="packages" className="ls-band ls-band--tint" aria-labelledby="packages-title">
        <div className="ls-inner">
          <div className="ls-head ls-head--split ls-reveal">
            <div>
              <span className="ls-rule" aria-hidden="true" />
              <p className="ls-eyebrow">Packages</p>
              <h2 className="ls-title" id="packages-title">
                Choose a catering package
              </h2>
              <p className="ls-lede">
                Each package sets the food, the setup, and the guest range it is built
                for. Open one to see everything it includes.
              </p>
            </div>
            <button type="button" className="ls-textlink" onClick={() => navigate("/packages")}>
              View all packages
              <span aria-hidden="true">→</span>
            </button>
          </div>

          {content.packages.status === "loading" && (
            <div className="ls-card-grid" aria-hidden="true">
              {[0, 1, 2].map((key) => (
                <div className="ls-pkg" key={key}>
                  <div className="ls-skel ls-skel-media" />
                  <div className="ls-pkg-body">
                    <div className="ls-skel ls-skel-line" style={{ width: "62%", height: 18 }} />
                    <div className="ls-skel ls-skel-line" />
                    <div className="ls-skel ls-skel-line" style={{ width: "80%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {content.packages.status === "error" &&
            renderError(
              "We couldn't load our packages",
              "Something went wrong on our side. Try again in a moment, or call us and we'll walk you through the options.",
              () => retryContent(["packages"]),
            )}

          {content.packages.status === "ready" && packageShowcase.length === 0 && (
            <div className="ls-state">
              <p className="ls-state-title">No packages are published right now</p>
              <p>
                We can still cater your event — send us your date and guest count and
                we'll put a quote together.
              </p>
              <div className="ls-state-actions">
                <button type="button" className="ls-btn ls-btn--sm ls-btn--primary" onClick={() => goToBooking()}>
                  Request Custom Booking
                </button>
              </div>
            </div>
          )}

          {content.packages.status === "ready" && packageShowcase.length > 0 && (
            <div className="ls-card-grid ls-reveal ls-stagger">
              {packageShowcase.map((pkg) => {
                /* One promoted offer sits among the packages rather than in a
                   band of its own. It is the same card with the offer
                   treatment — dark ground, badge, rate per pax — so it is
                   unmistakable without becoming a different component. */
                if (isSpecialOffer(pkg)) {
                  const perPax = offerPricePerPax(pkg);
                  const pax = offerGuestCount(pkg);
                  // The first few dishes, as a taste of the combo. The detail
                  // page is where the whole meal is laid out.
                  const food = offerFoodItems(pkg).slice(0, 3);
                  const moreFood = Math.max(
                    0,
                    offerFoodItems(pkg).length - food.length,
                  );

                  return (
                    <article className="ls-pkg ls-offer" key={pkg._id || pkg.name}>
                      <div className="ls-pkg-media">
                        {pkg.image_url ? (
                          <img
                            src={pkg.image_url}
                            alt={`${pkg.name} combo pack`}
                            loading="lazy"
                          />
                        ) : (
                          <div className="ls-pkg-media-empty">{pkg.name}</div>
                        )}
                        <span className="ls-offer-tag">Combo Pack</span>
                      </div>

                      <div className="ls-pkg-body">
                        <h3>{pkg.name}</h3>

                        {/* A combo's headline is its rate per pax. A combo
                            with no rate set is unfinished configuration, so
                            nothing is printed rather than a ₱0 nobody set. */}
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
                          {pkg.badge_text && (
                            <span className="ls-offer-chip">{pkg.badge_text}</span>
                          )}
                        </div>

                        {pkg.description && (
                          <p className="ls-pkg-desc">{pkg.description}</p>
                        )}

                        {food.length > 0 && (
                          <ul className="ls-offer-includes">
                            {food.map((item, index) => (
                              <li key={index}>{item.item_name}</li>
                            ))}
                            {moreFood > 0 && <li>+{moreFood} more</li>}
                          </ul>
                        )}

                        <div className="ls-pkg-actions">
                          <button
                            type="button"
                            className="ls-btn ls-btn--primary ls-btn--block"
                            onClick={() => navigate(`/packages/${pkg._id}`)}
                          >
                            View combo
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }

                const capacity = capacityLabel(pkg);
                const inclusionCount = Array.isArray(pkg.inclusions)
                  ? pkg.inclusions.length
                  : 0;

                return (
                  <article className="ls-pkg" key={pkg._id || pkg.name}>
                    <div className="ls-pkg-media">
                      {pkg.image_url ? (
                        <img src={pkg.image_url} alt={`${pkg.name} package`} loading="lazy" />
                      ) : (
                        <div className="ls-pkg-media-empty">{pkg.name}</div>
                      )}
                      {pkg.event_type && <span className="ls-pkg-tag">{pkg.event_type}</span>}
                    </div>

                    <div className="ls-pkg-body">
                      <h3>{pkg.name}</h3>
                      {pkg.description && <p className="ls-pkg-desc">{pkg.description}</p>}

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
                                {inclusionCount} {inclusionCount === 1 ? "item" : "items"}
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
        </div>
      </section>

      {/* ── How booking works ──────────────────────────────── */}
      <section id="how-it-works" className="ls-band ls-band--surface" aria-labelledby="how-it-works-title">
        <div className="ls-inner">
          <div className="ls-head ls-reveal">
            <span className="ls-rule" aria-hidden="true" />
            <p className="ls-eyebrow">How it works</p>
            <h2 className="ls-title" id="how-it-works-title">
              Booking in four simple steps
            </h2>
            <p className="ls-lede">
              Choose a package or request a custom booking — the process from
              there is the same.
            </p>
          </div>

          <ol className="ls-steps ls-reveal ls-stagger">
            {BOOKING_STEPS.map((step, index) => (
              <li className="ls-step" key={step.title}>
                <span className="ls-step-num">STEP {index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Menu preview ───────────────────────────────────── */}
      <section id="menu" className="ls-band ls-band--page" aria-labelledby="menu-title">
        <div className="ls-inner">
          <div className="ls-head ls-head--split ls-reveal">
            <div>
              <span className="ls-rule" aria-hidden="true" />
              <p className="ls-eyebrow">The food</p>
              <h2 className="ls-title" id="menu-title">
                Browse our menu
              </h2>
              <p className="ls-lede">
                Dishes you can add to any booking.
              </p>
            </div>
            <button type="button" className="ls-textlink" onClick={() => navigate("/menu")}>
              View full menu
              <span aria-hidden="true">→</span>
            </button>
          </div>

          {content.menu.status === "loading" && (
            <div className="ls-dish-grid" aria-hidden="true">
              {[0, 1, 2, 3].map((key) => (
                <div key={key}>
                  <div className="ls-skel ls-skel-media ls-skel-media--dish" />
                  <div className="ls-skel ls-skel-line" style={{ width: "70%" }} />
                  <div className="ls-skel ls-skel-line" style={{ width: "40%" }} />
                </div>
              ))}
            </div>
          )}

          {content.menu.status === "error" &&
            renderError(
              "We couldn't load the menu",
              "The dish list didn't come through. Try again, or call us and we'll talk you through what's available.",
              () => retryContent(["menu"]),
            )}

          {content.menu.status === "ready" && availableMenu.length === 0 && (
            <div className="ls-state">
              <p className="ls-state-title">The menu is being updated</p>
              <p>New dishes are on their way. Get in touch and we'll tell you what we can cook for your date.</p>
            </div>
          )}

          {content.menu.status === "ready" && availableMenu.length > 0 && (
            <div className="ls-dish-grid ls-reveal ls-stagger">
              {availableMenu.slice(0, 4).map((dish) => (
                <article className="ls-dish" key={dish._id || dish.name}>
                  <div className="ls-dish-media">
                    {dish.image_url ? (
                      <img src={dish.image_url} alt={dish.name} loading="lazy" />
                    ) : null}
                  </div>
                  <div className="ls-dish-row">
                    <h3>{dish.name}</h3>
                  </div>
                  {dish.category && <p className="ls-dish-cat">{dish.category}</p>}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Gallery: hidden entirely when there is nothing to show ── */}
      {!(content.gallery.status === "ready" && galleryItems.length === 0) && (
      <section id="gallery" className="ls-band ls-band--surface" aria-labelledby="gallery-title">
        <div className="ls-inner ls-inner--wide">
          <div className="ls-head ls-head--split ls-reveal">
            <div>
              <span className="ls-rule" aria-hidden="true" />
              <p className="ls-eyebrow">Our work</p>
              <h2 className="ls-title" id="gallery-title">
                Events we have catered
              </h2>
            </div>
            <button type="button" className="ls-textlink" onClick={() => navigate("/gallery")}>
              View full gallery
              <span aria-hidden="true">→</span>
            </button>
          </div>

          {content.gallery.status === "loading" && (
            <div className="ls-gallery ls-gallery--feature" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((key) => (
                <div className="ls-skel ls-gallery-item" key={key} />
              ))}
            </div>
          )}

          {content.gallery.status === "error" &&
            renderError(
              "We couldn't load the photos",
              "Our event photos aren't loading right now. Try again in a moment.",
              () => retryContent(["gallery"]),
            )}

          {content.gallery.status === "ready" && galleryItems.length > 0 && (
            <div
              className={`ls-gallery ls-reveal ls-stagger${
                galleryItems.length >= GALLERY_PREVIEW_COUNT
                  ? " ls-gallery--feature"
                  : ""
              }`}
            >
              {galleryItems.slice(0, GALLERY_PREVIEW_COUNT).map((item, index) => (
                <button
                  type="button"
                  className="ls-gallery-item"
                  key={item._id || item.image_url}
                  onClick={() => setLightboxIndex(index)}
                  aria-label={`View photo: ${item.title || "catered event"}`}
                >
                  <img
                    src={item.image_url}
                    alt={item.title || "A catered event by Caezelle's"}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* ── Reviews: only rendered when there are any ──────── */}
      {content.reviews.status === "ready" && reviews.length > 0 && (
        <section className="ls-band ls-band--page" aria-labelledby="reviews-title">
          <div className="ls-inner">
            <div className="ls-head ls-reveal">
              <span className="ls-rule" aria-hidden="true" />
              <p className="ls-eyebrow">Reviews</p>
              <h2 className="ls-title" id="reviews-title">
                What our clients say
              </h2>
            </div>

            <div className="ls-quotes ls-reveal ls-stagger">
              {reviews.slice(0, 3).map((review) => {
                const stars = Math.max(0, Math.min(5, Number(review.stars) || 0));
                const name = review?.customer_id?.full_name || "Verified customer";

                return (
                  <figure className="ls-quote" key={review._id || `${name}-${review.createdAt}`}>
                    <span className="ls-quote-stars" aria-label={`${stars} out of 5 stars`}>
                      <span aria-hidden="true">
                        {"★".repeat(stars)}
                        {"☆".repeat(5 - stars)}
                      </span>
                    </span>
                    <blockquote>
                      <p>{review.review}</p>
                    </blockquote>
                    <figcaption className="ls-quote-by">{name}</figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Closing booking moment ─────────────────────────── */}
      <section id="contact" className="ls-band ls-band--ink" aria-labelledby="contact-title">
        <div className="ls-inner ls-close ls-reveal">
          <div>
            <span className="ls-rule" aria-hidden="true" />
            <h2 className="ls-title" id="contact-title">
              Reserve your date
            </h2>
            <p className="ls-lede">
              Tell us the date, the guest count, and what you need on the table. We'll
              confirm availability and send the details back to you.
            </p>
            <div className="ls-close-actions">
              <button type="button" className="ls-btn ls-btn--onink" onClick={() => navigate("/packages")}>
                Book Now
              </button>
              <button type="button" className="ls-btn ls-btn--light" onClick={() => goToBooking()}>
                Request Custom Booking
              </button>
            </div>
          </div>

          <dl className="ls-close-contact">
            <div>
              <dt>Call or text</dt>
              <dd>
                <a href={`tel:${contactNumber.replace(/\s+/g, "")}`}>{contactNumber}</a>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </dd>
            </div>
            <div>
              <dt>Open</dt>
              <dd>{hours}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <CustomerFooter businessInfo={businessInfo} />

      {/* ── Gallery lightbox ───────────────────────────────── */}
      {lightboxIndex !== null && galleryItems[lightboxIndex] && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photo"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="lightbox-close"
            type="button"
            aria-label="Close photo"
            onClick={() => setLightboxIndex(null)}
          >
            ×
          </button>
          <img
            src={galleryItems[lightboxIndex].image_url}
            alt={galleryItems[lightboxIndex].title || "A catered event by Caezelle's"}
            className="lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </CustomerLayout>
  );
}
