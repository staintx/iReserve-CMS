import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function PackageDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  useEffect(() => {
    let isMounted = true;

    CustomerAPI.getPackageById(id)
      .then((res) => {
        if (!isMounted) return;
        if (res?.data?.available === false) {
          navigate("/packages", { replace: true });
          return;
        }
        setPkg(res.data);
      })
      .catch(() => {
        if (!isMounted) return;
        navigate("/packages", { replace: true });
      });

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  if (!pkg) return null;

  const formatMoney = (value) => {
    const number = Number(value);
    return Number.isFinite(number)
      ? number.toLocaleString("en-PH")
      : value || "";
  };

  // Use price_per_guest directly
  const perGuest = Number(pkg.price_per_guest);
  const hasPrice = Number.isFinite(perGuest);

  const getEventType = (data) => {
    if (data?.event_type) return data.event_type;
    const name = (data?.name || "").toLowerCase();
    if (name.includes("birthday")) return "Birthday";
    if (name.includes("wedding")) return "Wedding";
    if (name.includes("corporate")) return "Corporate";
    return "";
  };

  const derivedEventType = getEventType(pkg);

  const inclusions = Array.isArray(pkg.inclusions) ? pkg.inclusions : [];
  const addOns = Array.isArray(pkg.add_ons) ? pkg.add_ons : [];

  // Estimate total for a typical guest count (if min/max available)
  const guestMin = pkg.guest_min || 0;
  const guestMax = pkg.guest_max || 0;
  const estimatedTotal = hasPrice && guestMin > 0 ? perGuest * guestMin : null;

  return (
    <CustomerLayout>
      <div className="bg-background min-h-screen">
        {/* Hero Section */}
        <div
          className="relative h-[60vh] min-h-[400px] w-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${pkg.image_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 flex flex-col justify-end px-4 pb-16 pt-8 md:px-12 lg:px-24">
            <Button
              variant="ghost"
              className="absolute top-6 left-4 md:left-12 lg:left-24 text-white hover:bg-white/20 hover:text-white group"
              onClick={() => navigate("/packages")}
            >
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Packages
            </Button>

            <div className="max-w-4xl">
              <p className="text-accent font-bold tracking-widest uppercase text-sm mb-2 drop-shadow-md">
                Caezelle's Catering
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-4 drop-shadow-lg leading-tight">
                {pkg.name}
              </h1>
              <p className="text-lg md:text-xl text-white/90 max-w-2xl mb-8 drop-shadow-md">
                {pkg.description}
              </p>

              <div className="flex flex-wrap gap-3">
                <div className="bg-black/40 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center shadow-lg">
                  <span className="opacity-70 mr-1">Size:</span>{" "}
                  {pkg.size || "Custom"}
                </div>
                {/* Price per guest */}
                <div className="bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-bold flex items-center shadow-lg">
                  {hasPrice ? (
                    <>
                      ₱{formatMoney(perGuest)}{" "}
                      <span className="font-normal text-xs ml-1 opacity-80">
                        / guest
                      </span>
                    </>
                  ) : (
                    "Contact for pricing"
                  )}
                </div>
                <div className="bg-black/40 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center shadow-lg">
                  {pkg.rating || "4.5"}{" "}
                  <Star className="w-3.5 h-3.5 ml-1 fill-accent text-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 lg:px-12 flex flex-col lg:flex-row gap-12">
          {/* Main Details */}
          <div className="flex-1 space-y-12">
            <section>
              <h2 className="text-2xl font-serif font-bold text-foreground mb-6 pb-4 border-b border-border">
                About This Package
              </h2>
              <p className="text-muted-foreground leading-relaxed text-lg mb-8">
                {pkg.fullDescription || pkg.description}
              </p>

            </section>

            <section>
              <div className="flex items-end justify-between mb-6 pb-4 border-b border-border">
                <h2 className="text-2xl font-serif font-bold text-foreground">
                  Services & Inclusions
                </h2>
                <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {inclusions.length || "0"} items
                </span>
              </div>

              {inclusions.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  {inclusions.map((item) => (
                    <div className="flex items-start gap-3" key={item}>
                      <div className="mt-1 w-5 h-5 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </div>
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-muted rounded-xl p-8 text-center text-muted-foreground italic">
                  Inclusions will be tailored based on your event needs.
                </div>
              )}
            </section>

            <section>
              <div className="flex items-end justify-between mb-6 pb-4 border-b border-border">
                <h2 className="text-2xl font-serif font-bold text-foreground">
                  Add Ons
                </h2>
                <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {addOns.length || "0"} options
                </span>
              </div>

              {addOns.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                  {addOns.map((item) => (
                    <div className="flex items-start gap-3" key={item}>
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      <span className="text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-muted rounded-xl p-8 text-center text-muted-foreground italic">
                  Let us know if you want additional services or items.
                </div>
              )}
            </section>

            {pkg.gallery && pkg.gallery.length > 0 && (
              <section>
                <div className="flex items-end justify-between mb-6 pb-4 border-b border-border">
                  <h2 className="text-2xl font-serif font-bold text-foreground">
                    Gallery
                  </h2>
                  <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {pkg.gallery.length} photos
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {pkg.gallery.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="aspect-square rounded-xl overflow-hidden cursor-pointer group relative"
                      onClick={() => setLightboxIndex(idx)}
                    >
                      <img
                        src={imgUrl}
                        alt={`Gallery ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-medium">
                          View
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar / Pricing Card */}
          <aside className="w-full lg:w-[400px] shrink-0">
            <div className="sticky top-24 space-y-6">
              <Card className="border-border shadow-lg overflow-hidden">
                <div className="bg-accent/10 p-6 border-b border-border">
                  <p className="text-sm font-bold text-accent uppercase tracking-wider mb-2">
                    Per‑Guest Price
                  </p>
                  <h2 className="text-4xl font-serif font-bold text-foreground">
                    {hasPrice ? <>₱{formatMoney(perGuest)}</> : "Contact us"}
                  </h2>
                  {hasPrice && (
                    <p className="text-sm text-muted-foreground mt-1">
                      per person (minimum {guestMin || "0"} guests)
                    </p>
                  )}
                </div>

                <CardContent className="p-6">
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center py-2 border-b border-border border-dashed">
                      <span className="text-muted-foreground">Guest Range</span>
                      <strong className="text-foreground">
                        {guestMin && guestMax
                          ? `${guestMin} – ${guestMax}`
                          : pkg.size || "Custom"}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border border-dashed">
                      <span className="text-muted-foreground">
                        Starting Price
                      </span>
                      <strong className="text-foreground">
                        {hasPrice && guestMin > 0 ? (
                          <>₱{formatMoney(estimatedTotal)}</>
                        ) : (
                          "Varies"
                        )}
                      </strong>
                    </div>
                    {pkg.max_guests && (
                      <div className="flex justify-between items-center py-2 border-b border-border border-dashed">
                        <span className="text-muted-foreground">
                          Max Guests
                        </span>
                        <strong className="text-foreground">
                          {pkg.max_guests}
                        </strong>
                      </div>
                    )}
                    {pkg.event_type && (
                      <div className="flex justify-between items-center py-2 border-b border-border border-dashed">
                        <span className="text-muted-foreground">
                          Event Type
                        </span>
                        <strong className="text-foreground">
                          {pkg.event_type}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Button
                      className="w-full py-6 text-base font-bold shadow-md"
                      onClick={() =>
                        navigate("/customer/book", {
                          state: {
                            eventType: derivedEventType,
                            packageId: pkg._id,
                            packagePrice: hasPrice ? perGuest : 0, // per‑guest price
                            packageName: pkg.name,
                          },
                        })
                      }
                    >
                      Book Now
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full py-6 text-base"
                      onClick={() =>
                        navigate("/customer/quote", {
                          state: { eventType: derivedEventType },
                        })
                      }
                    >
                      Request Custom Quote
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary text-primary-foreground border-none shadow-md">
                <CardContent className="p-6">
                  <h4 className="font-bold text-lg mb-2">
                    Need help deciding?
                  </h4>
                  <p className="text-primary-foreground/80 text-sm mb-6 leading-relaxed">
                    Send us your event details and we will tailor the package to
                    match your theme and guests.
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => navigate("/customer/messages")}
                  >
                    Message Us
                  </Button>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>

        {/* Bottom CTA */}
        <section className="bg-accent/10 border-t border-accent/20 mt-12 py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Ready to Book?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              We will confirm availability and secure your date within 24 hours.
              Start planning your unforgettable event today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                className="px-8 font-bold"
                onClick={() =>
                  navigate("/customer/book", {
                    state: {
                      eventType: derivedEventType,
                      packageId: pkg._id,
                      packagePrice: hasPrice ? perGuest : 0,
                      packageName: pkg.name,
                    },
                  })
                }
              >
                Book Now
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-8 bg-background"
                onClick={() =>
                  navigate("/customer/quote", {
                    state: { eventType: derivedEventType },
                  })
                }
              >
                Request Custom Quote
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="w-6 h-6" />
          </button>

          <button
            className="absolute left-6 w-14 h-14 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(
                (lightboxIndex - 1 + pkg.gallery.length) % pkg.gallery.length,
              );
            }}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <img
            src={pkg.gallery[lightboxIndex]}
            alt="Gallery Expanded"
            className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-sm"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            className="absolute right-6 w-14 h-14 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex + 1) % pkg.gallery.length);
            }}
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          <div className="absolute bottom-6 left-0 right-0 text-center text-white/50 font-medium tracking-widest text-sm">
            {lightboxIndex + 1} / {pkg.gallery.length}
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
