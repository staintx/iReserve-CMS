import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { ChevronDown, ChevronUp, Check, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [filterType, setFilterType] = useState("All");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [appliedPriceMin, setAppliedPriceMin] = useState("");
  const [appliedPriceMax, setAppliedPriceMax] = useState("");
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [menuItems, setMenuItems] = useState([]);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const navigate = useNavigate();

  const formatMoney = (value) => {
    const number = Number(value);
    return Number.isFinite(number)
      ? number.toLocaleString("en-PH")
      : value || "";
  };

  const getEventType = (data) => {
    if (data?.event_type) return data.event_type;
    const name = (data?.name || "").toLowerCase();
    if (name.includes("birthday")) return "Birthday";
    if (name.includes("wedding")) return "Wedding";
    if (name.includes("corporate")) return "Corporate";
    return "";
  };

  useEffect(() => {
    CustomerAPI.getPackages().then((res) => {
      const next = Array.isArray(res.data) ? res.data : [];
      setPackages(next.filter((pkg) => pkg?.available !== false));
    });
    CustomerAPI.getMenu().then((res) => {
      const next = Array.isArray(res.data) ? res.data : [];
      setMenuItems(
        next.filter((item) => item?.available !== false).map((m) => m.name),
      );
    });
  }, []);

  const eventTypes = [
    "All",
    ...new Set(packages.map((p) => p.event_type).filter(Boolean)),
  ];

  const filteredPackages = packages.filter((p) => {
    if (filterType !== "All" && p.event_type !== filterType) return false;

    // Price filter uses price_per_guest
    if (appliedPriceMin !== "" || appliedPriceMax !== "") {
      const perGuest = Number(p.price_per_guest);
      if (!Number.isFinite(perGuest)) return false;
      if (appliedPriceMin !== "" && perGuest < Number(appliedPriceMin))
        return false;
      if (appliedPriceMax !== "" && perGuest > Number(appliedPriceMax))
        return false;
    }

    return true;
  });

  const handleApplyPrice = () => {
    setAppliedPriceMin(priceMin);
    setAppliedPriceMax(priceMax);
    setIsPriceFilterOpen(false);
  };

  const handleClearFilters = () => {
    setFilterType("All");
    setPriceMin("");
    setPriceMax("");
    setAppliedPriceMin("");
    setAppliedPriceMax("");
    setIsPriceFilterOpen(false);
  };

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 mt-8 text-center">
          <h1 className="mb-3 font-serif text-4xl font-bold tracking-tight text-foreground">
            Browse Catering Packages
          </h1>
          <p className="text-sm text-muted-foreground">
            Select the package that best fits your event and guest count
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {/* Event Type Chips */}
          {eventTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                "rounded-full px-4 py-2 text-sm transition",
                filterType === type
                  ? "bg-primary text-primary-foreground"
                  : "border border-primary text-primary hover:bg-primary/5",
              )}
              onClick={() => setFilterType(type)}
            >
              {type}
            </button>
          ))}

          {/* Subtle Vertical Divider */}
          <div className="mx-1 h-6 w-px bg-border" />

          {/* Price Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm text-primary transition hover:bg-primary/5"
              onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
            >
              Price Filter
              {isPriceFilterOpen ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>

            {isPriceFilterOpen && (
              <div className="absolute left-1/2 top-full z-50 mt-2 flex w-72 -translate-x-1/2 flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₱
                    </span>
                    <Input
                      type="number"
                      placeholder="Min per guest"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                  <span className="text-muted-foreground">-</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₱
                    </span>
                    <Input
                      type="number"
                      placeholder="Max per guest"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={handleApplyPrice}>
                    Apply
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setPriceMin("");
                      setPriceMax("");
                      setAppliedPriceMin("");
                      setAppliedPriceMax("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {filteredPackages.length === 0 ? (
          <div className="my-10 py-20 text-center">
            <h3 className="mb-2 text-xl font-medium text-foreground">
              No packages found
            </h3>
            <p className="mb-6 text-muted-foreground">
              Try adjusting your filters or clearing them to see all packages.
            </p>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="rounded-full"
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPackages.map((p, index) => {
              const perGuest = Number(p.price_per_guest);
              const hasPrice = Number.isFinite(perGuest);
              const guestMin = p.guest_min || 0;
              const guestMax = p.guest_max || 0;
              const startingTotal =
                hasPrice && guestMin > 0 ? perGuest * guestMin : null;
              const inclusions = Array.isArray(p.inclusions)
                ? p.inclusions
                : [];

              const isPopular =
                p.name.toLowerCase().includes("gold") ||
                p.name.toLowerCase().includes("prestige");
              const isSelected = selectedPackageId === p._id;

              return (
                <Card
                  className={cn(
                    "flex cursor-pointer flex-col overflow-hidden transition-all hover:shadow-md",
                    isSelected
                      ? "border-2 border-accent ring-1 ring-accent"
                      : "border-border shadow-sm",
                  )}
                >
                  <div className="group relative h-56 w-full">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-300 group-hover:bg-black/30">
                      <Button
                        variant="secondary"
                        className="opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/packages/${p._id}`);
                        }}
                      >
                        View Details
                      </Button>
                    </div>

                    {isSelected && (
                      <div className="absolute left-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}

                    {isPopular && (
                      <div className="absolute right-3 top-3 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-gold-900 shadow">
                        Most Popular
                      </div>
                    )}

                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                      <h3
                        className="cursor-pointer text-2xl font-serif font-bold leading-tight text-white transition hover:text-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/packages/${p._id}`);
                        }}
                      >
                        {p.name}
                      </h3>
                      {(p.size || p.max_guests) && (
                        <span className="text-[13px] text-white/90 drop-shadow-sm">
                          {p.size
                            ? p.size.toLowerCase().includes("guest") ||
                              p.size.toLowerCase().includes("pax")
                              ? p.size
                              : `${p.size} guests`
                            : `Up to ${p.max_guests} guests`}
                        </span>
                      )}
                    </div>
                  </div>

                  <CardContent className="flex flex-1 flex-col p-6">
                    <p className="mb-5 min-h-[40px] text-sm leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                    <div className="mb-5 flex flex-wrap gap-2">
                      {p.event_type && (
                        <span className="rounded-full bg-muted px-3 py-1 text-xs">
                          {p.event_type}
                        </span>
                      )}

                      {p.max_guests && (
                        <span className="rounded-full bg-muted px-3 py-1 text-xs">
                          Up to {p.max_guests} Guests
                        </span>
                      )}
                    </div>

                    <div className="mb-6">
                      {expandedMenus[p._id] && (
                        <ul className="mt-3 space-y-1.5 border-l-2 border-accent/30 pl-3">
                          {(menuItems.length > 0
                            ? menuItems.slice(
                                index % Math.max(1, menuItems.length - 6),
                                (index % Math.max(1, menuItems.length - 6)) + 6,
                              )
                            : ["Sample items loading..."]
                          ).map((item, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-2 text-[12px] text-muted-foreground"
                            >
                              <span className="h-1 w-1 rounded-full bg-accent/60"></span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Price Display */}
                    <div className="mb-5 flex flex-col items-start">
                      {hasPrice && startingTotal !== null ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-accent">
                              ₱{formatMoney(startingTotal)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              starting
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ₱{formatMoney(perGuest)} / guest · {guestMin}–
                            {guestMax} guests
                          </div>
                        </>
                      ) : hasPrice ? (
                        <>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-accent">
                              ₱{formatMoney(perGuest)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              / guest
                            </span>
                          </div>
                          {guestMin > 0 && guestMax > 0 && (
                            <div className="text-sm text-muted-foreground">
                              {guestMin}–{guestMax} guests
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Contact for pricing
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/packages/${p._id}`);
                        }}
                      >
                        View Details
                      </Button>

                      <Button
                        className={cn(
                          isSelected ? "bg-accent text-accent-foreground" : "",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();

                          if (!isSelected) {
                            setSelectedPackageId(p._id);
                            return;
                          }

                          navigate("/customer/book", {
                            state: {
                              eventType: getEventType(p),
                              packageId: p._id,
                              packagePrice: hasPrice ? perGuest : 0,
                              packageName: p.name,
                            },
                          });
                        }}
                      >
                        {isSelected ? "Continue" : "Select"}
                      </Button>
                    </div>
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      Want to see the complete menu, gallery, and package
                      details?
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Custom Package CTA */}
        <div className="flex flex-col items-center justify-center pb-20 pt-8">
          <p className="mb-4 text-[14px] text-muted-foreground">
            Need a fully tailored experience?
          </p>
          <Button
            variant="outline"
            className="flex items-center gap-2 rounded-xl border-border bg-card px-6 py-6 font-medium text-foreground hover:bg-accent/5"
            onClick={() => navigate("/customer/book")}
          >
            <Settings size={18} className="text-muted-foreground" />
            Build a Custom Package
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}
