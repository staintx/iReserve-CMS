import { useEffect, useMemo, useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">Our Menu</h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Explore our wide selection of dishes crafted with the finest ingredients to make your event unforgettable.
          </p>
        </div>

        <div className="mb-10 flex flex-col items-center justify-between gap-6 md:flex-row md:items-end">
          <div className="flex w-full flex-wrap gap-2 md:w-auto">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                  activeCategory === c 
                    ? "bg-accent text-accent-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
                onClick={() => setActiveCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-sm shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search dishes..."
              className="pl-10 rounded-full bg-card"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-xl font-medium text-foreground mb-2">No dishes found</p>
            <p className="text-muted-foreground">Try adjusting your search or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((m) => (
              <Card key={m._id || m.name} className="overflow-hidden border-border transition-all hover:shadow-md bg-card">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {m.image_url ? (
                    <img 
                      src={m.image_url} 
                      alt={m.name} 
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" 
                      loading="lazy" 
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-accent/5">
                      <span className="text-muted-foreground">No image</span>
                    </div>
                  )}
                  {m.category && (
                    <div className="absolute right-3 top-3 rounded-full bg-background/80 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-foreground">
                      {m.category}
                    </div>
                  )}
                </div>
                <CardContent className="p-5">
                  <h3 className="mb-2 font-serif text-lg font-bold text-foreground line-clamp-1">{m.name}</h3>
                  {m.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2" title={m.description}>
                      {m.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}