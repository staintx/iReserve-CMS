import CustomerLayout from "../../components/layout/CustomerLayout";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CustomerAPI } from "../../api/customer";
import logo from "../../assets/images/logo.jpg";

const DEFAULT_BUSINESS_INFO = {
  business_name: "Caezelle's Catering",
  contact_number: "09123456789",
  email: "info@caezelle.com",
  address: "123 Culinary Street Food City",
  hours: "Mon-Fri: 7:30 AM - 7:00 PM",
  facebook: "https://facebook.com",
  instagram: "https://instagram.com",
  terms_url: "",
  privacy_url: "",
};

const HERO_COPY = {
  title: "Exceptional Catering & Event Styling",
  subheadline:
    "Elevated menus, luxurious presentation, and seamless planning for weddings, corporate events, and once-in-a-lifetime celebrations.",
};

const HERO_IMAGE_URL =
  "https://images.pexels.com/photos/28736727/pexels-photo-28736727.jpeg?auto=compress&cs=tinysrgb&w=1600";

function CateringIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h16" />
      <path d="M6 8v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" />
      <path d="M9 12h6" />
      <path d="M8 4h8" />
    </svg>
  );
}

function SetupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
      <path d="m18 15 0.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" />
    </svg>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [galleryItems, setGalleryItems] = useState([]);
  const [galleryLightboxIndex, setGalleryLightboxIndex] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [packages, setPackages] = useState([]);
  const [businessInfo, setBusinessInfo] = useState(DEFAULT_BUSINESS_INFO);

  useEffect(() => {
    let isMounted = true;

    const loadPublicContent = async () => {
      try {
        const [galleryResult, menuResult, ratingsResult, packagesResult, businessResult] =
          await Promise.allSettled([
            CustomerAPI.getGallery(),
            CustomerAPI.getMenu(),
            CustomerAPI.getRatings(),
            CustomerAPI.getPackages(),
            CustomerAPI.getBusinessInfo(),
          ]);

        if (!isMounted) return;

        const toArray = (result) => {
          if (result?.status !== "fulfilled") return [];
          return Array.isArray(result.value?.data) ? result.value.data : [];
        };

        setGalleryItems(toArray(galleryResult));
        setMenuItems(toArray(menuResult));
        setReviews(toArray(ratingsResult));
        setPackages(toArray(packagesResult));

        if (businessResult?.status === "fulfilled") {
          setBusinessInfo((prev) => ({
            ...prev,
            ...(businessResult.value?.data || {}),
          }));
        }
      } catch {
        if (!isMounted) return;
        setGalleryItems([]);
        setMenuItems([]);
        setReviews([]);
        setPackages([]);
        setBusinessInfo(DEFAULT_BUSINESS_INFO);
      }
    };

    loadPublicContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const scrollToSection = (sectionId) => {
    if (sectionId === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const rawHash = (location.hash || "").replace("#", "").trim();
    if (!rawHash) return;

    const legacyMap = {
      about: "testimonials",
      packages: "gallery",
    };

    const sectionId = legacyMap[rawHash] || rawHash;

    window.setTimeout(() => {
      scrollToSection(sectionId);
    }, 0);
  }, [location.hash]);

  const serviceOptions = [
    {
      title: "Catering Service",
      description: "Custom menus for weddings, birthdays, corporate gatherings, and private celebrations.",
      icon: <CateringIcon />,
      serviceType: "Food Only",
    },
    {
      title: "Event Setup",
      description: "Tables, décor, and on-site setup support designed for seamless event execution.",
      icon: <SetupIcon />,
      serviceType: "Event Setup Only",
    },
    {
      title: "Full-Service Booking",
      description: "A guided booking experience with package selection, add-ons, and coordination support.",
      icon: <SparkleIcon />,
      serviceType: "Food and Event Setup",
    },
  ];

  const featuredPackages = packages
    .filter((pkg) => pkg?.available !== false)
    .slice(0, 3);

  const formatPrice = (amount) => {
    if (amount === null || amount === undefined || amount === "") {
      return null;
    }

    const numericValue = Number(amount);
    if (Number.isNaN(numericValue)) {
      return null;
    }

    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  const goToBooking = (payload = {}) => {
    navigate("/customer/book", {
      state: {
        resetWizard: true,
        ...payload,
      },
    });
  };

  const footerBusinessName =
    businessInfo.business_name || DEFAULT_BUSINESS_INFO.business_name;
  const footerContactNumber =
    businessInfo.contact_number || DEFAULT_BUSINESS_INFO.contact_number;
  const footerEmail = businessInfo.email || DEFAULT_BUSINESS_INFO.email;
  const footerAddress = businessInfo.address || DEFAULT_BUSINESS_INFO.address;
  const footerHours = businessInfo.hours || DEFAULT_BUSINESS_INFO.hours;

  const footerLinks = [
    { label: "Terms & Conditions", href: businessInfo.terms_url },
    { label: "Privacy Policy", href: businessInfo.privacy_url },
  ].filter((link) => link.href);

  const socialLinks = [
    {
      label: "Facebook",
      href: businessInfo.facebook || DEFAULT_BUSINESS_INFO.facebook,
      icon: "facebook",
    },
    {
      label: "Instagram",
      href: businessInfo.instagram || DEFAULT_BUSINESS_INFO.instagram,
      icon: "instagram",
    },
  ].filter((link) => Boolean(link.href));

  return (
    <CustomerLayout>
      <div id="top" />
      <section className="landing-hero" aria-label="Featured hero section">
        <div className="landing-hero-visual" aria-hidden="true">
          <img src={HERO_IMAGE_URL} alt="Lavish grazing table presentation" />
        </div>
        <div className="landing-hero-overlay" aria-hidden="true" />
        <div className="landing-hero-panel landing-hero-copy">
          <p className="landing-hero-eyebrow">Elevated celebrations</p>
          <h1>{HERO_COPY.title}</h1>
          <p>{HERO_COPY.subheadline}</p>
          <div className="landing-hero-actions">
            <button className="btn landing-hero-btn-primary" type="button" onClick={() => goToBooking()}>
              Book Now
            </button>
            <button
              className="btn-outline btn-outline-light landing-hero-btn-secondary"
              type="button"
              onClick={() => goToBooking({ serviceType: "Food and Event Setup" })}
            >
              Explore Services
            </button>
          </div>
        </div>
      </section>

      <section id="services" className="section landing-section">
        <div className="landing-section-heading">
          <p className="landing-section-eyebrow">Choose your experience</p>
          <h2>Select Your Service</h2>
          <p>Choose the experience that fits your celebration and move straight into booking.</p>
        </div>
        <div className="service-feature-row">
          {serviceOptions.map((service) => (
            <button
              key={service.title}
              className="service-feature-item"
              type="button"
              onClick={() => goToBooking({ serviceType: service.serviceType })}
            >
              <div className="service-feature-icon" aria-hidden="true">
                {service.icon}
              </div>
              <div className="service-feature-copy">
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section id="packages" className="section landing-section soft-bg">
        <div className="landing-section-heading">
          <p className="landing-section-eyebrow">Ready to reserve</p>
          <h2>Ready-to-Book Packages</h2>
          <p>Browse our most requested package tiers and book right away.</p>
        </div>
        <div className="package-pricing-grid">
          {featuredPackages.map((pkg, index) => {
            const isCenterPackage = index === 1;
            const guestRange = pkg.guest_min || pkg.guest_max
              ? `${pkg.guest_min || 0}-${pkg.guest_max || "∞"} guests`
              : "Flexible guest count";
            const price = formatPrice(pkg.setup_price);
            const badgeLabel = pkg.badge_text || (pkg.featured ? "Featured" : "Popular");
            const displayPrice = pkg.price_label || (price ? price : "Custom quote");
            const featureList = Array.isArray(pkg.features)
              ? pkg.features.filter(Boolean)
              : [];
            const detailPath = pkg._id ? `/packages/${pkg._id}` : "/packages";

            return (
              <div
                key={pkg._id || pkg.name}
                className={`package-pricing-card ${isCenterPackage ? "package-pricing-card-featured" : ""}`}
              >
                <div className="package-pricing-media">
                  <img src={pkg.image_url} alt={pkg.name} />
                </div>
                {isCenterPackage && <div className="package-pricing-badge">{badgeLabel}</div>}
                {!isCenterPackage && badgeLabel && badgeLabel !== "Popular" ? (
                  <div className="package-pricing-badge package-pricing-badge-muted">{badgeLabel}</div>
                ) : null}
                <h3>{pkg.name}</h3>
                <p className="package-pricing-description">{pkg.description}</p>
                <div className="package-pricing-price">{displayPrice}</div>
                <div className="package-pricing-meta">{guestRange}</div>
                <div className="package-pricing-meta">{price ? `${price} setup fee` : "Setup options available"}</div>
                {featureList.length > 0 && (
                  <ul className="package-pricing-features">
                    {featureList.slice(0, 3).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                )}
                <div className="package-pricing-actions">
                  <button
                    className="btn"
                    type="button"
                    onClick={() =>
                      goToBooking({
                        packageId: pkg._id,
                        packageName: pkg.name,
                        packagePrice: pkg.setup_price || 0,
                        guestMin: pkg.guest_min || null,
                        guestMax: pkg.guest_max || null,
                        serviceType:
                          pkg.package_type === "Event Setup Only"
                            ? "Event Setup Only"
                            : pkg.package_type === "Food Only"
                              ? "Food Only"
                              : "Food and Event Setup",
                      })
                    }
                  >
                    Book This Package
                  </button>
                  <button
                    className="btn-outline package-pricing-link"
                    type="button"
                    onClick={() => navigate(detailPath)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="how-it-works" className="section landing-section soft-bg">
        <h2>How It Works</h2>
        <div className="how-works-row">
          {[
            {
              title: "1. Inquiry",
              text: "Tell us about your event and requirements.",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6h16v12H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              ),
            },
            {
              title: "2. Customize",
              text: "Choose your menu and customize details.",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 7H4" />
                  <path d="M10 7v14" />
                  <path d="M14 7v14" />
                  <path d="M6 7c0-2.2 2.7-4 6-4s6 1.8 6 4" />
                  <path d="M6 21h12" />
                </svg>
              ),
            },
            {
              title: "3. Enjoy",
              text: "We handle the rest on your big day.",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 12a4 4 0 0 0 4-4" />
                  <path d="M8 8a4 4 0 0 0 4 4" />
                  <path d="M12 12v9" />
                  <path d="M8 21h8" />
                  <path d="M7 7c0-2.2 2.2-4 5-4s5 1.8 5 4" />
                </svg>
              ),
            },
            {
              title: "4. Confirm",
              text: "Book and pay your deposit.",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6v7a4 4 0 0 1-4 4H7l-3 3v-3a4 4 0 0 1-2-3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                  <path d="m8 10 2 2 5-5" />
                </svg>
              ),
            },
          ].map((step) => (
            <div key={step.title} className="how-works-item">
              <div className="how-works-icon" aria-hidden="true">
                {step.icon}
              </div>
              <div className="how-works-title">{step.title}</div>
              <div className="how-works-text">{step.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="gallery" className="section landing-section">
        <h2>Our Gallery</h2>
        {galleryItems.length === 0 ? (
          <div className="mt-6 flex items-center justify-center py-16 text-sm text-slate-500">
            No Photos yet
          </div>
        ) : (
          <>
            <div className="gallery-preview-grid mt-6">
              {galleryItems.slice(0, 6).map((item, index) => (
                <div
                  key={item._id || item.image_url}
                  className="image-card tall cursor-pointer hover:scale-[1.02] hover:shadow-lg transition-all duration-300 bg-cover bg-center"
                  style={
                    item.image_url
                      ? { backgroundImage: `url(${item.image_url})` }
                      : undefined
                  }
                  role="button"
                  tabIndex={0}
                  onClick={() => setGalleryLightboxIndex(index)}
                  onKeyDown={(event) =>
                    event.key === "Enter" && setGalleryLightboxIndex(index)
                  }
                />
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <button
                className="btn-outline"
                type="button"
                onClick={() => navigate("/gallery")}
              >
                See All
              </button>
            </div>
          </>
        )}
      </section>

      {galleryLightboxIndex !== null && galleryItems[galleryLightboxIndex] && (
        <div
          className="lightbox-overlay"
          onClick={() => setGalleryLightboxIndex(null)}
        >
          <button
            className="lightbox-close"
            type="button"
            onClick={() => setGalleryLightboxIndex(null)}
          >
            ×
          </button>
          <img
            src={galleryItems[galleryLightboxIndex].image_url}
            alt={galleryItems[galleryLightboxIndex].title}
            className="lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      <section id="foods" className="section landing-section">
        <h2>Our Foods</h2>
        {menuItems.length === 0 ? (
          <div className="mt-6 flex items-center justify-center py-16 text-sm text-slate-500">
            No food yet
          </div>
        ) : (
          <>
            <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-4">
              {menuItems.slice(0, 8).map((food) => (
                <div key={food._id || food.name} className="food-card">
                  <div
                    className="image-card"
                    style={
                      food.image_url
                        ? { backgroundImage: `url(${food.image_url})` }
                        : undefined
                    }
                  />
                  <div className="food-name">{food.name}</div>
                </div>
              ))}
            </div>
            {menuItems.length > 8 && (
              <div className="flex justify-center mt-6">
                <button
                  className="btn-outline"
                  onClick={() => navigate("/menu")}
                >
                  See all
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section id="testimonials" className="section landing-section">
        <h2>What Our Clients Say</h2>
        {reviews.length === 0 ? (
          <div className="mt-6 flex items-center justify-center py-16 text-sm text-slate-500">
            No review yet
          </div>
        ) : (
          <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.slice(0, 3).map((review) => {
              const starsCount = Math.max(
                0,
                Math.min(5, Number(review.stars) || 0),
              );
              const starText =
                "★★★★★".slice(0, starsCount) + "☆☆☆☆☆".slice(0, 5 - starsCount);
              const customerName = review?.customer_id?.full_name || "Customer";

              return (
                <div
                  key={review._id || `${customerName}-${review.createdAt}`}
                  className="testimonial-card"
                >
                  <div className="stars">{starText}</div>
                  <p>{review.review}</p>
                  <strong>{customerName}</strong>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section landing-cta-surface">
        <h2>Ready to Plan Your Event?</h2>
        <p>Let's create an unforgettable experience together.</p>
        <button
          className="btn"
          type="button"
          onClick={() =>
            navigate("/customer/book", { state: { resetWizard: true } })
          }
        >
          Book Now
        </button>
      </section>

      <footer id="contact" className="landing-footer">
        <div className="footer-grid">
          <div className="footer-brand-panel">
            <div className="footer-brand">
              <img
                className="footer-logo"
                src={logo}
                alt="Caezelle Catering Services"
              />
              <div className="footer-brand-text">
                <div className="footer-brand-title">{footerBusinessName}</div>
                <p>Creating unforgettable culinary experiences since 2010.</p>
              </div>
            </div>
            <div className="footer-brand-summary">
              Professional catering, memorable presentation, and attentive
              service for every celebration.
            </div>
          </div>
          <div>
            <h4>Quick Links</h4>
            <a
              href="#top"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection("top");
              }}
            >
              Home
            </a>
            <a
              href="#gallery"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection("gallery");
              }}
            >
              Gallery
            </a>
            <a
              href="#foods"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection("foods");
              }}
            >
              Our Foods
            </a>
            <a
              href="#testimonials"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection("testimonials");
              }}
            >
              About Us
            </a>
          </div>
          <div>
            <h4>Contact</h4>
            <div className="footer-contact">
              <div className="footer-contact-item">
                <span className="footer-contact-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.06a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <a href={`tel:${footerContactNumber.replace(/\s+/g, "")}`}>
                  {footerContactNumber}
                </a>
              </div>
              <div className="footer-contact-item">
                <span className="footer-contact-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6h16v12H4z" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                </span>
                <a href={`mailto:${footerEmail}`}>{footerEmail}</a>
              </div>
              <div className="footer-contact-item">
                <span className="footer-contact-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
                    <path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                  </svg>
                </span>
                <span>{footerAddress}</span>
              </div>
            </div>
          </div>
          <div>
            <h4>Business Hours</h4>
            <p>{footerHours}</p>

            <div className="footer-policy-links">
              {footerLinks.length > 0 ? (
                footerLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {link.label}
                  </a>
                ))
              ) : (
                <span className="footer-empty-state">
                  Policies will appear here once configured.
                </span>
              )}
            </div>

            <div className="footer-social" aria-label="Social links">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={link.label}
                >
                  {link.icon === "facebook" ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.3V12h2.3V9.8c0-2.3 1.4-3.6 3.5-3.6 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.4.7-1.4 1.4V12h2.4l-.4 2.9h-2v7A10 10 0 0 0 22 12Z" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 4.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm0 2A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5ZM17.7 6.3a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z" />
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          © 2026 {footerBusinessName}. All rights reserved.
        </div>
      </footer>
    </CustomerLayout>
  );
}
