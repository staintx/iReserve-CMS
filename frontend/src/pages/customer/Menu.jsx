import { useEffect, useMemo, useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";

export default function Menu() {
  const [menu, setMenu] = useState([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    CustomerAPI.getMenu().then((res) => {
      const next = Array.isArray(res.data) ? res.data : [];
      setMenu(next.filter((item) => item?.available !== false));
    });
  }, []);

  const categories = useMemo(() => {
    const defaults = [
      "All",
      "Main Dishes",
      "Pasta",
      "Rice",
      "Desserts",
      "Drinks",
      "Wedding Specials",
      "Corporate Favorites"
    ];

    const fromData = new Set(
      menu
        .map((m) => m?.category)
        .filter(Boolean)
        .map((c) => String(c))
    );

    const merged = [...defaults, ...[...fromData].filter((c) => !defaults.includes(c))];
    return merged;
  }, [menu]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menu.filter((item) => {
      const matchesCategory = activeCategory === "All" ? true : item.category === activeCategory;
      const matchesQuery =
        !q ||
        item?.name?.toLowerCase().includes(q) ||
        item?.description?.toLowerCase().includes(q) ||
        item?.category?.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, menu, query]);

  return (
    <CustomerLayout>
      <div className="menu-page-head">
        <div className="menu-search" role="search">
          <span className="menu-search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search photos..."
            aria-label="Search foods"
          />
        </div>
      </div>

      <div className="menu-tabs" role="tablist" aria-label="Food categories">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`menu-tab ${c === activeCategory ? "active" : ""}`.trim()}
            onClick={() => setActiveCategory(c)}
            role="tab"
            aria-selected={c === activeCategory}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 flex items-center justify-center py-16 text-sm text-slate-500">
          No food yet
        </div>
      ) : (
        <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((m) => (
            <div key={m._id || m.name} className="menu-view-card">
              <div className="menu-view-media">
                {m.image_url ? (
                  <img src={m.image_url} alt={m.name} loading="lazy" />
                ) : (
                  <div className="menu-view-thumb" aria-hidden="true" />
                )}
              </div>
              <div className="menu-view-body">
                <div className="menu-view-title">{m.name}</div>
                {m.description ? <div className="menu-view-desc">{m.description}</div> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}