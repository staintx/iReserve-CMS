import CustomerLayout from "../../components/layout/CustomerLayout";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CustomerAPI } from "../../api/customer";
import logo from "../../assets/images/logo.jpg";

const HERO_MESSAGES = [
  {
    title: "Delicious Catering for your Special Events",
    description: "Creating unforgettable culinary experiences with exceptional service"
  },
  {
    title: "Fresh Menus Crafted by Experts",
    description: "From appetizers to desserts, every dish is prepared to impress your guests."
  },
  {
    title: "Elegant Setups for Every Celebration",
    description: "Beautiful food presentation and full-service planning for weddings, birthdays, and more."
  },
  {
    title: "Reliable Team, Memorable Experience",
    description: "Professional staff and seamless coordination so you can enjoy your event stress-free."
  }
];

const HERO_IMAGE_POOL = [
  "https://images.pexels.com/photos/5638732/pexels-photo-5638732.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/5779787/pexels-photo-5779787.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/5876397/pexels-photo-5876397.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/4553035/pexels-photo-4553035.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/5779818/pexels-photo-5779818.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/5638748/pexels-photo-5638748.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/5638730/pexels-photo-5638730.jpeg?auto=compress&cs=tinysrgb&w=1600",
  "https://images.pexels.com/photos/5638698/pexels-photo-5638698.jpeg?auto=compress&cs=tinysrgb&w=1600"
];

const SWIPE_THRESHOLD = 45;

const buildHeroSlides = () => {
  const shuffledImages = [...HERO_IMAGE_POOL]
    .map((imageUrl, index) => ({ imageUrl, order: Math.random() + index }))
    .sort((left, right) => left.order - right.order)
    .map((item) => item.imageUrl);

  return HERO_MESSAGES.map((slide, index) => ({
    ...slide,
    image: shuffledImages[index % shuffledImages.length]
  }));
};

export default function Landing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroSlides] = useState(() => buildHeroSlides());
  const swipeStartXRef = useRef(null);
  const [packages, setPackages] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 6000);

    return () => window.clearInterval(intervalId);
  }, [heroSlides.length]);

  useEffect(() => {
    let isMounted = true;

    const loadPublicContent = async () => {
      try {
        const [packagesResult, galleryResult, menuResult, ratingsResult] = await Promise.allSettled([
          CustomerAPI.getPackages(),
          CustomerAPI.getGallery(),
          CustomerAPI.getMenu(),
          CustomerAPI.getRatings()
        ]);

        if (!isMounted) return;

        const toArray = (result) => {
          if (result?.status !== "fulfilled") return [];
          return Array.isArray(result.value?.data) ? result.value.data : [];
        };

        setPackages(toArray(packagesResult).filter((pkg) => pkg?.available !== false));
        setGalleryItems(toArray(galleryResult));
        setMenuItems(toArray(menuResult));
        setReviews(toArray(ratingsResult));
      } catch {
        if (!isMounted) return;
        setPackages([]);
        setGalleryItems([]);
        setMenuItems([]);
        setReviews([]);
      }
    };

    loadPublicContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const goToSlide = (slideIndex) => {
    setActiveSlide(slideIndex);
  };

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
      about: "testimonials"
    };

    const sectionId = legacyMap[rawHash] || rawHash;

    window.setTimeout(() => {
      scrollToSection(sectionId);
    }, 0);
  }, [location.hash]);

  const goToPreviousSlide = () => {
    setActiveSlide((current) => (current - 1 + heroSlides.length) % heroSlides.length);
  };

  const goToNextSlide = () => {
    setActiveSlide((current) => (current + 1) % heroSlides.length);
  };

  const handleSwipeStart = (event) => {
    swipeStartXRef.current = event.clientX;
  };

  const resetSwipe = () => {
    swipeStartXRef.current = null;
  };

  const handleSwipeEnd = (event) => {
    if (swipeStartXRef.current === null) {
      return;
    }

    const swipeDistance = event.clientX - swipeStartXRef.current;
    resetSwipe();

    if (Math.abs(swipeDistance) < SWIPE_THRESHOLD) {
      return;
    }

    if (swipeDistance < 0) {
      goToNextSlide();
      return;
    }

    goToPreviousSlide();
  };

  const eventTypes = [
    { label: "Weddings", icon: "💍" },
    { label: "Corp Events", icon: "💼" },
    { label: "Birthday", icon: "🎂" },
    { label: "Celebrate", icon: "🎉" },
    { label: "Baby Shower", icon: "🍼" },
    { label: "Graduation", icon: "🎓" }
  ];

  return (
    <CustomerLayout>
      <div id="top" />
      <section
        className="landing-hero"
        onPointerDown={handleSwipeStart}
        onPointerUp={handleSwipeEnd}
        onPointerCancel={resetSwipe}
        onPointerLeave={resetSwipe}
      >
        <div className="landing-hero-track" aria-hidden="true">
          {heroSlides.map((slide, index) => (
            <div
              key={`${slide.image}-${index}`}
              className={`landing-hero-slide ${index === activeSlide ? "active" : ""}`}
              style={{ backgroundImage: `url(${slide.image})` }}
            />
          ))}
        </div>
        <div className="landing-hero-content">
          <h1>{heroSlides[activeSlide].title}</h1>
          <p>{heroSlides[activeSlide].description}</p>
          <button className="btn" type="button" onClick={() => navigate("/packages")}>Get Started</button>
          <div className="landing-dots">
            {heroSlides.map((slide, index) => (
              <button
                key={`${slide.image}-${index}`}
                type="button"
                className={`landing-dot ${index === activeSlide ? "active" : ""}`}
                onClick={() => goToSlide(index)}
                aria-label={`Show hero image ${index + 1}`}
                aria-pressed={index === activeSlide}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="event-types" className="section landing-section">
        <h2>Event Types We Serve</h2>
        <div className="event-types-row">
          {eventTypes.map((event) => (
            <div key={event.label} className="event-type-card">
              <div className="event-type-icon" aria-hidden="true">{event.icon}</div>
              <span className="event-type-label">{event.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="packages" className="section landing-section">
        <h2>Our Packages</h2>
        {packages.length === 0 ? (
          <div className="mt-6 flex items-center justify-center py-16 text-sm text-slate-500">
            No package yet
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-center gap-4 mt-6">
              {packages.slice(0, 4).map((pkg) => (
                <div key={pkg._id || pkg.name} className="landing-package-card">
                  <div className="landing-package-title">{pkg.name}</div>
                  <button
                    type="button"
                    className="landing-package-thumb"
                    style={pkg.image_url ? { backgroundImage: `url(${pkg.image_url})` } : undefined}
                    onClick={() => navigate(pkg._id ? `/packages/${pkg._id}` : "/packages")}
                    aria-label={`View ${pkg.name}`}
                  >
                    <div className="landing-package-hover" aria-hidden="true">
                      <div className="landing-package-hover-box">
                        <div className="landing-package-hover-title">{pkg.name}</div>
                        <div className="landing-package-hover-cta">
                          <span>Learn more</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h12" />
                            <path d="m13 6 6 6-6 6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
            {packages.length > 4 && (
              <div className="flex justify-center mt-6">
                <button className="btn-outline" onClick={() => navigate("/packages")}>See all</button>
              </div>
            )}
          </>
        )}
      </section>

      <section id="how-it-works" className="section landing-section soft-bg">
        <h2>How It Works</h2>
        <div className="how-works-row">
          {[
            {
              title: "1. Inquiry",
              text: "Tell us about your event and requirements.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16v12H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              )
            },
            {
              title: "2. Customize",
              text: "Choose your menu and customize details.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7H4" />
                  <path d="M10 7v14" />
                  <path d="M14 7v14" />
                  <path d="M6 7c0-2.2 2.7-4 6-4s6 1.8 6 4" />
                  <path d="M6 21h12" />
                </svg>
              )
            },
            {
              title: "3. Enjoy",
              text: "We handle the rest on your big day.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 12a4 4 0 0 0 4-4" />
                  <path d="M8 8a4 4 0 0 0 4 4" />
                  <path d="M12 12v9" />
                  <path d="M8 21h8" />
                  <path d="M7 7c0-2.2 2.2-4 5-4s5 1.8 5 4" />
                </svg>
              )
            },
            {
              title: "4. Confirm",
              text: "Book and pay your deposit.",
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6v7a4 4 0 0 1-4 4H7l-3 3v-3a4 4 0 0 1-2-3V6a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                  <path d="m8 10 2 2 5-5" />
                </svg>
              )
            }
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
          <div className="gallery-preview-grid mt-6">
            {galleryItems.slice(0, 6).map((item) => (
              <div
                key={item._id || item.image_url}
                className="image-card tall"
                style={item.image_url ? { backgroundImage: `url(${item.image_url})` } : undefined}
              />
            ))}
          </div>
        )}
      </section>

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
                    style={food.image_url ? { backgroundImage: `url(${food.image_url})` } : undefined}
                  />
                  <div className="food-name">{food.name}</div>
                </div>
              ))}
            </div>
            {menuItems.length > 8 && (
              <div className="flex justify-center mt-6">
                <button className="btn-outline" onClick={() => navigate("/menu")}>See all</button>
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
              const starsCount = Math.max(0, Math.min(5, Number(review.stars) || 0));
              const starText = "★★★★★".slice(0, starsCount) + "☆☆☆☆☆".slice(0, 5 - starsCount);
              const customerName = review?.customer_id?.full_name || "Customer";

              return (
                <div key={review._id || `${customerName}-${review.createdAt}`} className="testimonial-card">
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
        <button className="btn" type="button" onClick={() => navigate("/packages")}>Get Started Now</button>
      </section>

      <footer id="contact" className="landing-footer">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <img className="footer-logo" src={logo} alt="Caezelle Catering Services" />
              <div className="footer-brand-text">
                <div className="footer-brand-title">Caezelle Catering Services</div>
                <p>Creating unforgettable culinary experiences since 2010.</p>
              </div>
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
              href="#packages"
              onClick={(event) => {
                event.preventDefault();
                scrollToSection("packages");
              }}
            >
              Packages
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
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.86.3 1.7.54 2.5a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.58-1.06a2 2 0 0 1 2.11-.45c.8.24 1.64.42 2.5.54A2 2 0 0 1 22 16.92z" />
                  </svg>
                </span>
                <span>09123456789</span>
              </div>
              <div className="footer-contact-item">
                <span className="footer-contact-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 6h16v12H4z" />
                    <path d="m4 7 8 6 8-6" />
                  </svg>
                </span>
                <span>info@caezelle.com</span>
              </div>
              <div className="footer-contact-item">
                <span className="footer-contact-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z" />
                    <path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                  </svg>
                </span>
                <span>123 Culinary Street Food City</span>
              </div>
            </div>
          </div>
          <div>
            <h4>Business Hours</h4>
            <p>Mon-Fri: 7:30 AM - 7:00 PM</p>
            <p>Sat: 10:00 AM - 4:00 PM</p>
            <p>Sun: Closed</p>

            <div className="footer-social" aria-label="Social links">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22 12a10 10 0 1 0-11.6 9.9v-7h-2.3V12h2.3V9.8c0-2.3 1.4-3.6 3.5-3.6 1 0 2 .2 2 .2v2.2h-1.1c-1.1 0-1.4.7-1.4 1.4V12h2.4l-.4 2.9h-2v7A10 10 0 0 0 22 12Z" />
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 4.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm0 2A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5ZM17.7 6.3a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z" />
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M22 5.8c-.7.3-1.4.5-2.1.6.8-.5 1.3-1.2 1.6-2.1-.7.4-1.5.8-2.3.9a3.6 3.6 0 0 0-6.2 3.3A10.2 10.2 0 0 1 3.1 4.6a3.6 3.6 0 0 0 1.1 4.8c-.6 0-1.1-.2-1.6-.4v.1a3.6 3.6 0 0 0 2.9 3.5c-.3.1-.6.1-1 .1-.2 0-.5 0-.7-.1a3.6 3.6 0 0 0 3.3 2.5A7.2 7.2 0 0 1 2 17.5a10.2 10.2 0 0 0 5.6 1.6c6.7 0 10.4-5.6 10.4-10.4v-.5c.7-.5 1.3-1.1 2-1.9Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">© 2026 Caezelle's Catering. All rights reserved.</div>
      </footer>
    </CustomerLayout>
  );
}