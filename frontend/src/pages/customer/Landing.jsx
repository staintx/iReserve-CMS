import CustomerLayout from "../../components/layout/CustomerLayout";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CustomerAPI } from "../../api/customer";
import CustomerFooter from "../../components/layout/CustomerFooter";
import { DEFAULT_BUSINESS_INFO } from "../../hooks/useBusinessInfo";
import useRevealOnScroll from "../../hooks/useRevealOnScroll";
import { useOverduePayment } from "../../context/OverduePaymentContext";
import {
  capacityLabel,
  eventTypeForPackage,
  packagePriceParts,
  priceLabel,
} from "../../lib/packageDisplay";
import {
  isSpecialOffer,
  offerGuestCount,
  offerPricePerPax,
  offerFoodItems,
  offerFoodByCategory,
} from "../../lib/specialOffers";
import {
  ChevronDown,
  CalendarDays,
  ArrowRight,
  Star,
  CheckCircle2,
  Quote,
  X,
  Package,
} from "lucide-react";

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
  const { checkOverdueAndProceed } = useOverduePayment();

  const [content, setContent] = useState({
    packages: { status: "loading", data: [] },
    menu: { status: "loading", data: [] },
    gallery: { status: "loading", data: [] },
    reviews: { status: "loading", data: [] },
  });
  const [businessInfo, setBusinessInfo] = useState(DEFAULT_BUSINESS_INFO);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [allReviewsOpen, setAllReviewsOpen] = useState(false);

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
    const legacyMap = { about: "contact", testimonials: "reviews", foods: "menu" };
    const sectionId = legacyMap[rawHash] || rawHash;

    const timer = window.setTimeout(() => scrollToSection(sectionId), 0);
    return () => window.clearTimeout(timer);
  }, [location.hash, scrollToSection]);

  const galleryItems = content.gallery.data;

  useEffect(() => {
    if (lightboxIndex === null && !allReviewsOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (lightboxIndex !== null) setLightboxIndex(null);
        if (allReviewsOpen) setAllReviewsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxIndex, allReviewsOpen]);

  const goToBooking = (payload = {}) => {
    checkOverdueAndProceed(() => {
      navigate("/customer/book", { state: { resetWizard: true, ...payload } });
    });
  };

  const publishedPackages = useMemo(
    () => content.packages.data.filter((pkg) => pkg?.available !== false),
    [content.packages.data],
  );

  const availablePackages = useMemo(
    () => publishedPackages.filter((pkg) => !isSpecialOffer(pkg)),
    [publishedPackages],
  );

  const availableSpecialOffers = useMemo(
    () => publishedPackages.filter(isSpecialOffer),
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

  // Hero statistics row: Total Packages, Total Special Offers, Years of Experience, and Customizable Packages
  const heroFacts = useMemo(
    () => [
      {
        value:
          content.packages.status === "loading"
            ? "—"
            : String(availablePackages.length),
        label: "Total Packages",
      },
      {
        value:
          content.packages.status === "loading"
            ? "—"
            : String(availableSpecialOffers.length),
        label: "Total Special Offers",
      },
      {
        value: String(
          businessInfo?.years_of_experience ||
            DEFAULT_BUSINESS_INFO.years_of_experience ||
            10,
        ),
        label: "Years of Experience",
      },
      {
        value: "100%",
        label: "Customizable Packages",
      },
    ],
    [
      content.packages.status,
      availablePackages.length,
      availableSpecialOffers.length,
      businessInfo?.years_of_experience,
    ],
  );

  const validReviews = useMemo(() => {
    return (content.reviews.data || []).filter(
      (r) => r && typeof r.stars === "number" && r.stars >= 1 && r.stars <= 5,
    );
  }, [content.reviews.data]);

  const totalReviews = validReviews.length;

  const averageRating = useMemo(() => {
    if (!totalReviews) return 0;
    const sum = validReviews.reduce((acc, curr) => acc + curr.stars, 0);
    return Number((sum / totalReviews).toFixed(1));
  }, [validReviews, totalReviews]);

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
          <p className="ls-hero-eyebrow">Hassle-free reservations</p>
          <h1 id="hero-title">
            Effortless event catering, made to fit your celebration.
          </h1>
          <p className="ls-hero-sub">
            Select your favorite dishes, customize your package, and secure your
            event schedule in just a few clicks.
          </p>

          <div className="ls-hero-actions">
            <button
              type="button"
              className="ls-btn-inquire"
              onClick={() => navigate("/packages")}
            >
              <CalendarDays className="ls-btn-inquire-icon" size={19} strokeWidth={2.2} />
              <span>Inquire Now</span>
              <ArrowRight className="ls-btn-inquire-arrow" size={19} strokeWidth={2.2} />
            </button>
          </div>

          <dl className="ls-hero-facts">
            {heroFacts.map((fact) => (
              <div className="ls-hero-fact" key={fact.label}>
                <dt className="sr-only">{fact.label}</dt>
                <dd>
                  <strong>{fact.value}</strong>
                  <span className="ls-hero-fact-label">{fact.label}</span>
                </dd>
              </div>
            ))}
          </dl>
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
                  Request Custom
                </button>
              </div>
            </div>
          )}

          {content.packages.status === "ready" && packageShowcase.length > 0 && (
            <div className="ls-card-grid ls-reveal ls-stagger">
              {packageShowcase.map((pkg) => {
                /* One promoted offer sits among the packages rather than in a
                   band of its own. It is the same card with the combo
                   treatment — cohesive deeper slate-blue ground, badge, rate per pax — so it is
                   unmistakable without becoming a different component. */
                if (isSpecialOffer(pkg)) {
                  const perPax = offerPricePerPax(pkg);

                  return (
                    <LandingComboCard
                      key={pkg._id || pkg.name}
                      pkg={pkg}
                      perPax={perPax}
                      peso={peso}
                      navigate={navigate}
                    />
                  );
                }

                const capacity = capacityLabel(pkg);
                const priceInfo = packagePriceParts(pkg);
                const eventTag = eventTypeForPackage(pkg) || pkg.event_type || "Package";

                return (
                  <article className="ls-pkg ls-pkg--standard" key={pkg._id || pkg.name}>
                    <div className="ls-pkg-media">
                      {pkg.image_url ? (
                        <img src={pkg.image_url} alt={`${pkg.name} package`} loading="lazy" />
                      ) : (
                        <div className="ls-pkg-media-empty">
                          <Package size={34} strokeWidth={1.5} className="ls-pkg-empty-icon" aria-hidden="true" />
                        </div>
                      )}
                      <span className="ls-pkg-tag">{eventTag}</span>
                    </div>

                    <div className="ls-pkg-body">
                      <h3>{pkg.name}</h3>
                      <p className="ls-pkg-desc">{pkg.description || "\u00A0"}</p>

                      <dl className="ls-pkg-facts">
                        <div className="ls-pkg-fact">
                          <dt>Price</dt>
                          <dd className="ls-pkg-price-val">
                            {priceInfo.amount ? (
                              <>
                                {priceInfo.prefix && (
                                  <span className="ls-pkg-price-sub">{priceInfo.prefix}</span>
                                )}
                                <strong className="ls-pkg-price-amount">{priceInfo.amount}</strong>
                                {priceInfo.suffix && (
                                  <span className="ls-pkg-price-sub">{priceInfo.suffix}</span>
                                )}
                              </>
                            ) : (
                              <strong className="ls-pkg-price-text">{priceInfo.text}</strong>
                            )}
                          </dd>
                        </div>
                        <div className="ls-pkg-fact">
                          <dt>Estimated Guests</dt>
                          <dd>
                            <strong className="ls-pkg-guests-val">
                              {capacity || "Flexible capacity"}
                            </strong>
                          </dd>
                        </div>
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

      {/* ── Reviews: rendered when completed-event customer ratings exist ── */}
      {content.reviews.status === "ready" && totalReviews > 0 && (
        <section id="reviews" className="ls-band ls-band--page" aria-labelledby="reviews-title">
          <div className="ls-inner">
            <div className="ls-reviews-header-wrap ls-reveal">
              <div className="ls-reviews-header-info">
                <span className="ls-rule" aria-hidden="true" />
                <p className="ls-eyebrow">Customer Reviews</p>
                <h2 className="ls-title" id="reviews-title">
                  What our customers say
                </h2>
                <p className="ls-lede">
                  Real feedback from clients who celebrated weddings, birthdays, and
                  special gatherings with Caezelle's Catering.
                </p>
              </div>

              {/* Integrated Trust Summary */}
              <div className="ls-trust-summary" aria-label="Customer rating summary">
                <div className="ls-trust-rating-row">
                  <div className="ls-trust-score">
                    <span className="ls-trust-score-num">{averageRating.toFixed(1)}</span>
                    <span className="ls-trust-score-denom">/ 5</span>
                  </div>
                  <div className="ls-trust-stars-wrap">
                    <StarRating rating={averageRating} size={15} />
                    <span className="ls-trust-count-text">
                      {totalReviews === 1
                        ? "Based on 1 verified customer review"
                        : `Based on ${totalReviews} verified customer reviews`}
                    </span>
                  </div>
                </div>

                {totalReviews > 3 && (
                  <div className="ls-trust-sub-row">
                    <button
                      type="button"
                      className="ls-trust-seeall-link"
                      onClick={() => setAllReviewsOpen(true)}
                    >
                      See all {totalReviews}
                      <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Testimonials 3-Column Editorial Grid (stacked on mobile) */}
            <div
              className={`ls-testimonials-grid ls-reveal ls-stagger${
                validReviews.length === 1
                  ? " ls-testimonials-grid--single"
                  : validReviews.length === 2
                  ? " ls-testimonials-grid--double"
                  : ""
              }`}
            >
              {validReviews.slice(0, 3).map((review, idx) => (
                <CustomerReviewCard
                  key={review._id || `${review.customer_id?.full_name}-${review.createdAt}`}
                  review={review}
                  index={idx}
                  formatReviewDate={formatReviewDate}
                />
              ))}
            </div>

            {totalReviews > 3 && (
              <div className="ls-testimonials-actions ls-reveal">
                <button
                  type="button"
                  className="ls-btn-see-all-reviews"
                  onClick={() => setAllReviewsOpen(true)}
                >
                  <span>See all {totalReviews} reviews</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Closing booking moment ─────────────────────────── */}
      <section id="contact" className="ls-band ls-band--ink" aria-labelledby="contact-title">
        <div className="ls-inner ls-bridge ls-reveal">
          <div>
            <span className="ls-rule" aria-hidden="true" />
            <h2 className="ls-title" id="contact-title">
              Reserve your date
            </h2>
            <p className="ls-lede">
              Tell us the date, the guest count, and what you need on the table. We'll
              confirm availability and send the details back to you.
            </p>
          </div>
          <div className="ls-bridge-actions">
            <button
              type="button"
              className="ls-btn-inquire"
              onClick={() => navigate("/packages")}
            >
              <CalendarDays className="ls-btn-inquire-icon" size={19} strokeWidth={2.2} />
              <span>Inquire Now</span>
              <ArrowRight className="ls-btn-inquire-arrow" size={19} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Footer ────────────────────────────────────── */}
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

      {/* ── All Customer Reviews Modal ─────────────────────── */}
      {allReviewsOpen && (
        <div
          className="ls-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="all-reviews-title"
          onClick={() => setAllReviewsOpen(false)}
        >
          <div
            className="ls-modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ls-modal-header">
              <div>
                <h3 className="ls-modal-title" id="all-reviews-title">
                  Customer Reviews
                </h3>
                <div className="ls-modal-subtitle">
                  <StarRating rating={averageRating} size={14} />
                  <span>
                    <strong>{averageRating.toFixed(1)}</strong> of 5.0
                  </span>
                  <span>•</span>
                  <span>
                    {totalReviews === 1
                      ? "1 verified review"
                      : `${totalReviews} verified reviews`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="ls-modal-close"
                onClick={() => setAllReviewsOpen(false)}
                aria-label="Close reviews dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ls-modal-body">
              {validReviews.map((review, idx) => (
                <CustomerReviewCard
                  key={review._id || `${review.customer_id?.full_name}-${review.createdAt}`}
                  review={review}
                  index={idx}
                  formatReviewDate={formatReviewDate}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}

const formatReviewDate = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
};

const getCustomerInitials = (name) => {
  if (!name || typeof name !== "string") return "CU";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getCustomerEventDetails = (review) => {
  if (!review) return null;

  const rawEventType =
    review.event_type ||
    review.eventType ||
    review.booking_id?.event_type ||
    review.booking_id?.eventType ||
    review.booking?.event_type ||
    review.booking?.eventType ||
    review.booking_id?.event_name ||
    review.booking_id?.eventName ||
    null;

  const rawCount =
    review.guest_count ??
    review.guestCount ??
    review.pax ??
    review.booking_id?.guest_count ??
    review.booking_id?.guestCount ??
    review.booking_id?.pax ??
    review.booking?.guest_count ??
    review.booking?.guestCount ??
    review.booking?.pax ??
    null;

  const eventType =
    typeof rawEventType === "string" && rawEventType.trim().length > 0
      ? rawEventType.trim()
      : null;

  const countNum = Number(rawCount);
  const guestCount =
    !isNaN(countNum) && countNum > 0
      ? `${countNum} ${countNum === 1 ? "Guest" : "Guests"}`
      : null;

  if (eventType && guestCount) {
    return `${eventType} · ${guestCount}`;
  }
  if (eventType) {
    return eventType;
  }
  if (guestCount) {
    return guestCount;
  }
  return null;
};

function EditorialQuoteMark() {
  return (
    <div className="ls-testimonial-quote-mark" aria-hidden="true">
      <Quote size={15} className="ls-testimonial-quote-symbol ls-testimonial-quote-svg" />
    </div>
  );
}

function StarRating({ rating = 0, size = 15, className = "" }) {
  const clamped = Math.max(0, Math.min(5, Number(rating) || 0));
  return (
    <div
      className={`ls-stars-row ${className}`}
      aria-label={`${clamped} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((starIndex) => {
        const isFilled = starIndex <= Math.round(clamped);
        return (
          <Star
            key={starIndex}
            size={size}
            className={`ls-star-icon ${isFilled ? "is-filled" : "is-empty"}`}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

function CustomerReviewCard({ review, index = 0, formatReviewDate }) {
  const stars = Math.max(0, Math.min(5, Number(review.stars) || 0));
  const name = review?.customer_id?.full_name?.trim() || "Customer";
  const dateFormatted = formatReviewDate(review.createdAt);
  const initials = getCustomerInitials(name);
  const eventDetails = getCustomerEventDetails(review);
  const avatarVariant = `ls-testimonial-avatar--${index % 4}`;

  return (
    <article className="ls-testimonial-card" key={review._id || `${name}-${review.createdAt}`}>
      <div className="ls-testimonial-card-header">
        <StarRating rating={stars} size={15} />
        {dateFormatted && <span className="ls-testimonial-date">{dateFormatted}</span>}
      </div>

      <div className="ls-testimonial-quote-mark" aria-hidden="true">
        <Quote size={15} className="ls-testimonial-quote-symbol ls-testimonial-quote-svg" />
      </div>

      <div className="ls-testimonial-body">
        <p className="ls-testimonial-text">
          {review.review || "Rating submitted for completed event."}
        </p>
      </div>

      <div className="ls-testimonial-footer">
        <div className={`ls-testimonial-avatar ${avatarVariant}`} aria-hidden="true">
          {initials}
        </div>
        <div className="ls-testimonial-identity">
          <span className="ls-testimonial-name">{name}</span>
          <span className="ls-testimonial-verified">
            <CheckCircle2 size={12.5} className="ls-testimonial-verified-icon" aria-hidden="true" />
            <span>Verified Booking</span>
          </span>
          {eventDetails && (
            <span className="ls-testimonial-event">{eventDetails}</span>
          )}
        </div>
      </div>
    </article>
  );
}

function LandingComboCard({ pkg, perPax, peso, navigate }) {
  return (
    <article className="ls-pkg ls-pkg--combo" key={pkg._id || pkg.name}>
      <div className="ls-pkg-media">
        {pkg.image_url ? (
          <img
            src={pkg.image_url}
            alt={`${pkg.name} combo pack`}
            loading="lazy"
          />
        ) : (
          <div className="ls-pkg-media-empty">
            <Package size={34} strokeWidth={1.5} className="ls-pkg-empty-icon" aria-hidden="true" />
          </div>
        )}
        <span className="ls-pkg-tag ls-pkg-tag--combo">Combo Pack</span>
      </div>

      <div className="ls-pkg-body">
        <h3>{pkg.name}</h3>
        <p className="ls-pkg-desc">{pkg.description || "\u00A0"}</p>

        <dl className="ls-pkg-facts">
          <div className="ls-pkg-fact">
            <dt>Price</dt>
            <dd className="ls-pkg-price-val">
              {perPax > 0 ? (
                <>
                  <strong className="ls-pkg-price-amount">{peso(perPax)}</strong>
                  <span className="ls-pkg-price-sub">per pax</span>
                </>
              ) : (
                <strong className="ls-pkg-price-text">Quoted per event</strong>
              )}
            </dd>
          </div>
        </dl>

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
