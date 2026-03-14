import CustomerLayout from "../../components/layout/CustomerLayout";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();
  const eventTypes = [
    { label: "Weddings", icon: "💍" },
    { label: "Corp Events", icon: "💼" },
    { label: "Birthday", icon: "🎂" },
    { label: "Celebrate", icon: "🎉" },
    { label: "Baby Shower", icon: "🍼" },
    { label: "Graduation", icon: "🎓" }
  ];
  const packages = [
    { title: "Birthday Package 1", tag: "Most Popular" },
    { title: "Birthday Package 2" },
    { title: "Wedding Package 1" },
    { title: "Wedding Package 3" }
  ];
  const foods = ["Adobo", "Kaldereta", "Menudo", "Sisig", "Pansit", "Cordon Bleu", "Carbonara", "Shanghai"];
  const testimonials = [
    { name: "Jeffrey Aguasan", note: "Wedding Reception", text: "Caezelle's made our wedding day perfect. The food and service were exceptional." },
    { name: "Ryosuke Takashi", note: "Wedding Reception", text: "Caezelle's made our wedding day perfect. The food and service were exceptional." },
    { name: "Jhong Hilario", note: "Wedding Reception", text: "Caezelle's made our wedding day perfect. The food and service were exceptional." }
  ];

  return (
    <CustomerLayout>
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1>Delicious Catering for your Special Events</h1>
          <p>Creating unforgettable culinary experiences with exceptional service and exquisite flavors.</p>
          <button className="btn" onClick={() => navigate("/customer/book")}>Get Started</button>
          <div className="landing-dots">
            <span className="landing-dot" />
            <span className="landing-dot" />
            <span className="landing-dot" />
            <span className="landing-dot active" />
          </div>
        </div>
      </section>

      <section id="event-types" className="section landing-section">
        <h2>Event Types We Serve</h2>
        <div className="grid mt-6 sm:grid-cols-3 lg:grid-cols-6">
          {eventTypes.map((event) => (
            <div key={event.label} className="landing-card center">
              <div className="icon-circle">{event.icon}</div>
              <span>{event.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="packages" className="section landing-section">
        <h2>Our Packages</h2>
        <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <div key={pkg.title} className="package-card">
              <div className="image-card" />
              <div className="package-body">
                <h3>{pkg.title}</h3>
                {pkg.tag && <span className="pill">{pkg.tag}</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-6">
          <button className="btn-outline" onClick={() => navigate("/packages")}>See all</button>
        </div>
      </section>

      <section id="how-it-works" className="section landing-section soft-bg">
        <h2>How It Works</h2>
        <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "1. Inquiry", text: "Tell us about your event and requirements." },
            { title: "2. Customize", text: "Choose your menu and customize details." },
            { title: "3. Confirm", text: "Book and pay your deposit." },
            { title: "4. Enjoy", text: "We handle the rest on your big day." }
          ].map((step) => (
            <div key={step.title} className="landing-card">
              <div className="icon-circle">✓</div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="gallery" className="section landing-section">
        <h2>Our Gallery</h2>
        <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`gallery-${index}`} className="image-card tall" />
          ))}
        </div>
      </section>

      <section id="foods" className="section landing-section">
        <h2>Our Foods</h2>
        <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-4">
          {foods.map((food) => (
            <div key={food} className="food-card">
              <div className="image-card" />
              <div className="food-name">{food}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-6">
          <button className="btn-outline" onClick={() => navigate("/menu")}>See all</button>
        </div>
      </section>

      <section id="testimonials" className="section landing-section">
        <h2>What Our Clients Say</h2>
        <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((card, index) => (
            <div key={`${card.name}-${index}`} className="testimonial-card">
              <div className="stars">★★★★★</div>
              <p>{card.text}</p>
              <strong>{card.name}</strong>
              <span>{card.note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section cta gradient">
        <h2>Ready to Plan Your Event?</h2>
        <p>Let's create an unforgettable experience together.</p>
        <button className="btn" onClick={() => navigate("/customer/book")}>Get Started Now</button>
      </section>

      <footer id="contact" className="landing-footer">
        <div className="footer-grid">
          <div>
            <div className="brand-mark">Caezelle's Catering</div>
            <p>Creating unforgettable culinary experiences since 2010.</p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <a href="/">Home</a>
            <a href="/packages">Packages</a>
            <a href="/gallery">Gallery</a>
            <a href="/#about">About Us</a>
          </div>
          <div>
            <h4>Contact</h4>
            <p>09123456789</p>
            <p>info@caezelle.com</p>
            <p>123 Culinary Street Food City</p>
          </div>
          <div>
            <h4>Business Hours</h4>
            <p>Mon-Fri: 7:30 AM - 7:00 PM</p>
            <p>Sat: 10:00 AM - 4:00 PM</p>
            <p>Sun: Closed</p>
          </div>
        </div>
        <div className="footer-bottom">© 2026 Caezelle's Catering. All rights reserved.</div>
      </footer>
    </CustomerLayout>
  );
}