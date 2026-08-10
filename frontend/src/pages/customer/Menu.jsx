import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import CustomerFooter from "../../components/layout/CustomerFooter";
import useBusinessInfo, { DEFAULT_BUSINESS_INFO } from "../../hooks/useBusinessInfo";
import { CustomerAPI } from "../../api/customer";
import { Search } from "lucide-react";
import { CATEGORY_GROUPS, resolveGroup } from "../../lib/menuCategories";

const peso = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function Menu() {
  const navigate = useNavigate();
  const businessInfo = useBusinessInfo();
  const [menu, setMenu] = useState({ status: "loading", data: [] });
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");

  const fetchMenu = useCallback(
    () =>
      CustomerAPI.getMenu()
        .then((res) => ({
          status: "ready",
          data: Array.isArray(res?.data) ? res.data : [],
        }))
        .catch(() => ({ status: "error", data: [] })),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetchMenu().then((next) => {
      if (!cancelled) setMenu(next);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchMenu]);

  const retry = () => {
    setMenu((prev) => ({ ...prev, status: "loading" }));
    fetchMenu().then(setMenu);
  };

  // Every available dish, tagged with the group it belongs to.
  const dishes = useMemo(
    () =>
      menu.data
        .filter((item) => item?.available !== false)
        .map((item) => ({ ...item, group: resolveGroup(item.category) })),
    [menu.data],
  );

  // Only groups that actually have dishes — a filter can never come up empty.
  const groups = useMemo(() => {
    const byId = new Map();
    dishes.forEach((dish) => {
      const existing = byId.get(dish.group.id);
      if (existing) {
        existing.count += 1;
        return;
      }
      byId.set(dish.group.id, { ...dish.group, count: 1 });
    });

    const order = CATEGORY_GROUPS.map((group) => group.id);
    return [...byId.values()].sort((a, b) => {
      const aIndex = order.indexOf(a.id);
      const bIndex = order.indexOf(b.id);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [dishes]);

  // A category that disappears (the data changed under us) must not leave the
  // page stuck on a filter that matches nothing — fall back to all dishes.
  const selectedGroup =
    activeGroup !== "all" && !groups.some((group) => group.id === activeGroup)
      ? "all"
      : activeGroup;

  const searchTerm = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      dishes.filter((dish) => {
        if (selectedGroup !== "all" && dish.group.id !== selectedGroup) return false;
        if (!searchTerm) return true;
        return (
          dish.name?.toLowerCase().includes(searchTerm) ||
          dish.description?.toLowerCase().includes(searchTerm) ||
          dish.category?.toLowerCase().includes(searchTerm) ||
          dish.group.label.toLowerCase().includes(searchTerm)
        );
      }),
    [dishes, selectedGroup, searchTerm],
  );

  // Browsing everything reads best as a menu — grouped sections in course
  // order. Narrowing to one category or searching reads best as a flat result
  // list, so the count and the matches are what you see first.
  const isBrowsingAll = selectedGroup === "all" && !searchTerm;

  const sections = useMemo(() => {
    if (!isBrowsingAll) return [];
    return groups
      .map((group) => ({
        ...group,
        items: filtered.filter((dish) => dish.group.id === group.id),
      }))
      .filter((section) => section.items.length > 0);
  }, [groups, filtered, isBrowsingAll]);

  const contactNumber =
    businessInfo.contact_number || DEFAULT_BUSINESS_INFO.contact_number;

  const renderDish = (dish, { showCategory = false } = {}) => {
    const price = peso(dish.price);
    return (
      <article className="ls-dish" key={dish._id || dish.name}>
        <div className="ls-dish-media">
          {dish.image_url ? (
            <img src={dish.image_url} alt={dish.name} loading="lazy" />
          ) : (
            <div className="ls-dish-media-empty">{dish.name}</div>
          )}
        </div>
        <div className="ls-dish-row">
          <h3>{dish.name}</h3>
          {price && <span className="ls-dish-price">{price}</span>}
        </div>
        {showCategory && <p className="ls-dish-cat">{dish.group.label}</p>}
        {dish.description && <p className="ls-dish-desc">{dish.description}</p>}
      </article>
    );
  };

  return (
    <CustomerLayout marketing contentClassName="ls-main">
      <div className="ls-pagehead">
        <div className="ls-inner">
          <span className="ls-rule" aria-hidden="true" />
          <p className="ls-eyebrow">The food</p>
          <h1>Browse our menu</h1>
          <p className="ls-lede">
            Every dish here can go into a Food Only or Food + Setup booking. Pick
            what you want and we'll build the menu around your guest count.
          </p>
        </div>
      </div>

      {menu.status === "ready" && dishes.length > 0 && (
        <div className="ls-filterbar">
          <div className="ls-inner ls-filterbar-inner">
            <div className="ls-chips" role="group" aria-label="Filter by category">
              <button
                type="button"
                className="ls-chip"
                aria-pressed={selectedGroup === "all"}
                onClick={() => setActiveGroup("all")}
              >
                All dishes
              </button>
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="ls-chip"
                  aria-pressed={selectedGroup === group.id}
                  onClick={() => setActiveGroup(group.id)}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="ls-search">
              <Search aria-hidden="true" />
              <label className="sr-only" htmlFor="menu-search">
                Search dishes
              </label>
              <input
                id="menu-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search dishes"
              />
            </div>
          </div>
        </div>
      )}

      <section className="ls-band ls-band--page" aria-label="Menu">
        <div className="ls-inner">
          {menu.status === "loading" && (
            <div className="ls-dish-grid ls-dish-grid--menu" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((key) => (
                <div key={key}>
                  <div className="ls-skel ls-skel-media ls-skel-media--dish" />
                  <div className="ls-skel ls-skel-line" style={{ width: "70%" }} />
                  <div className="ls-skel ls-skel-line" style={{ width: "45%" }} />
                </div>
              ))}
            </div>
          )}

          {menu.status === "error" && (
            <div className="ls-state" role="status">
              <p className="ls-state-title">We couldn't load the menu</p>
              <p>
                Something went wrong on our side. Try again in a moment, or call
                us and we'll talk you through what we can cook for your event.
              </p>
              <div className="ls-state-actions">
                <button type="button" className="ls-btn ls-btn--sm ls-btn--ghost" onClick={retry}>
                  Try again
                </button>
                <a
                  className="ls-btn ls-btn--sm ls-btn--ghost"
                  href={`tel:${contactNumber.replace(/\s+/g, "")}`}
                >
                  Call {contactNumber}
                </a>
              </div>
            </div>
          )}

          {menu.status === "ready" && dishes.length === 0 && (
            <div className="ls-state">
              <p className="ls-state-title">The menu is being updated</p>
              <p>
                New dishes are on their way. Tell us your date and guest count and
                we'll put a menu together for you.
              </p>
              <div className="ls-state-actions">
                <button
                  type="button"
                  className="ls-btn ls-btn--sm ls-btn--primary"
                  onClick={() =>
                    navigate("/customer/book", { state: { resetWizard: true } })
                  }
                >
                  Book an Event
                </button>
              </div>
            </div>
          )}

          {menu.status === "ready" && dishes.length > 0 && isBrowsingAll && (
            <div>
              {sections.map((section) => (
                <section className="ls-menu-section" key={section.id} aria-labelledby={`section-${section.id}`}>
                  <div className="ls-menu-section-head">
                    <h2 id={`section-${section.id}`}>{section.label}</h2>
                    <span className="ls-menu-count">
                      {section.items.length}{" "}
                      {section.items.length === 1 ? "dish" : "dishes"}
                    </span>
                  </div>
                  <div className="ls-dish-grid ls-dish-grid--menu">
                    {section.items.map((dish) => renderDish(dish))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {menu.status === "ready" && dishes.length > 0 && !isBrowsingAll && (
            <div>
              <div className="ls-menu-section-head">
                <h2>
                  {searchTerm
                    ? `Results for "${query.trim()}"`
                    : groups.find((group) => group.id === selectedGroup)?.label}
                </h2>
                <span className="ls-menu-count" role="status">
                  {filtered.length} {filtered.length === 1 ? "dish" : "dishes"}
                </span>
              </div>

              {filtered.length === 0 ? (
                <div className="ls-state">
                  <p className="ls-state-title">No dishes match that search</p>
                  <p>Try a different word, or browse the full menu.</p>
                  <div className="ls-state-actions">
                    <button
                      type="button"
                      className="ls-btn ls-btn--sm ls-btn--ghost"
                      onClick={() => {
                        setQuery("");
                        setActiveGroup("all");
                      }}
                    >
                      Show all dishes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ls-dish-grid ls-dish-grid--menu">
                  {filtered.map((dish) =>
                    renderDish(dish, { showCategory: Boolean(searchTerm) }),
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="ls-band ls-band--ink" aria-labelledby="menu-bridge-title">
        <div className="ls-inner ls-bridge">
          <div>
            <span className="ls-rule" aria-hidden="true" />
            <h2 className="ls-title" id="menu-bridge-title">
              Ready to build your menu?
            </h2>
            <p className="ls-lede">
              Start a booking and you'll choose your dishes as part of it — or
              browse the packages if you'd rather start from a set menu.
            </p>
          </div>
          <div className="ls-bridge-actions">
            <button
              type="button"
              className="ls-btn ls-btn--onink"
              onClick={() =>
                navigate("/customer/book", { state: { resetWizard: true } })
              }
            >
              Book an Event
            </button>
            <button
              type="button"
              className="ls-btn ls-btn--light"
              onClick={() => navigate("/packages")}
            >
              Browse Packages
            </button>
          </div>
        </div>
      </section>

      <CustomerFooter businessInfo={businessInfo} />
    </CustomerLayout>
  );
}
