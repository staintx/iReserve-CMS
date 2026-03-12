import CustomerLayout from "../../components/layout/CustomerLayout";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <CustomerLayout>
      <section className="hero">
        <div className="max-w-xl space-y-5">
          <p className="chip">Premium catering for unforgettable moments</p>
          <h1 className="text-4xl sm:text-5xl">Delicious catering for your special events.</h1>
          <p className="text-base text-white/80">Make your event unforgettable with thoughtfully curated menus and seamless service.</p>
          <div className="flex flex-wrap gap-3">
            <button className="btn" onClick={() => navigate("/customer/book")}>Book Now</button>
            <button className="btn-outline border-white/40 text-white hover:border-white" onClick={() => navigate("/packages")}>View Packages</button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl">Event types we serve</h2>
          <span className="text-sm text-slate-500">From intimate dinners to full-scale celebrations</span>
        </div>
        <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-5">
          {["Wedding", "Birthday", "Corporate", "Debut", "Reunion"].map((label) => (
            <div key={label} className="card p-5 text-center text-sm font-semibold text-ink-800">{label}</div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl">Our packages</h2>
          <button className="btn-ghost" onClick={() => navigate("/packages")}>Explore all</button>
        </div>
        <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {["Wedding Package", "Birthday Package", "Corporate Package"].map((label) => (
            <div key={label} className="card p-6">
              <h3 className="text-lg font-semibold text-ink-900">{label}</h3>
              <p className="mt-2 text-sm text-slate-500">Custom menus, premium service, and curated styling.</p>
              <div className="mt-4 flex items-center gap-3">
                <button className="btn">View details</button>
                <button className="btn-outline">Inquire</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section banner">
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            { title: "Submit inquiry", detail: "Tell us your vision, date, and guest count." },
            { title: "Choose package", detail: "Pick a menu and service style tailored to you." },
            { title: "Confirm booking", detail: "Lock in the details and let us handle the rest." }
          ].map((step, index) => (
            <div key={step.title} className="space-y-2">
              <p className="text-sm font-semibold text-ink-700">0{index + 1}</p>
              <h3 className="text-lg font-semibold text-ink-900">{step.title}</h3>
              <p className="text-sm text-ink-700">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="text-2xl">Gallery highlights</h2>
        <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {["Wedding", "Birthday", "Corporate"].map((label) => (
            <div key={label} className="card p-6 text-sm font-semibold text-ink-800">{label}</div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="text-2xl">Signature dishes</h2>
        <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-3">
          {["Roasted Chicken", "House Pasta", "Seasonal Desserts"].map((label) => (
            <div key={label} className="card p-6">
              <h3 className="text-lg font-semibold text-ink-900">{label}</h3>
              <p className="mt-2 text-sm text-slate-500">Fresh ingredients, plated with care.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section cta">
        <h2 className="text-2xl">Ready to plan your event?</h2>
        <p className="mt-2 text-sm text-white/80">Share the details and get a tailored proposal in 24 hours.</p>
        <div className="mt-5 flex justify-center">
          <button className="btn">Get Started</button>
        </div>
      </section>
    </CustomerLayout>
  );
}