import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { CustomerAPI } from "../../api/customer";
import { Button } from "../../components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const FILTER_CATEGORIES = ["All", "Weddings", "Birthday", "Corporate Events", "Food Display"];

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    CustomerAPI.getGallery().then((res) => setItems(res.data));
  }, []);

  const filteredItems = useMemo(() => {
    if (activeCategory === "All") return items;
    return items.filter((item) => String(item.category || "").toLowerCase() === activeCategory.toLowerCase());
  }, [items, activeCategory]);

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const showPrevious = (event) => {
    event.stopPropagation();
    setLightboxIndex((current) => (current - 1 + filteredItems.length) % filteredItems.length);
  };
  const showNext = (event) => {
    event.stopPropagation();
    setLightboxIndex((current) => (current + 1) % filteredItems.length);
  };

  useEffect(() => {
    if (lightboxIndex === null) return;
    if (lightboxIndex < 0 || lightboxIndex >= filteredItems.length) {
      setLightboxIndex(null);
    }
  }, [filteredItems, lightboxIndex]);

  return (
    <CustomerLayout>
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">Our Gallery</h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Explore our collection of beautifully crafted events and culinary presentations.
          </p>
        </div>

        <div className="mb-10 flex flex-wrap justify-center gap-3">
          {FILTER_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition-colors",
                activeCategory === category 
                  ? "bg-accent text-accent-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((g, index) => (
              <div
                className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-xl bg-muted"
                key={g._id}
                onClick={() => openLightbox(index)}
              >
                <img 
                  src={g.image_url} 
                  alt={g.title} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-6">
                  <span className="text-lg font-bold text-white drop-shadow-md">{g.title}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-xl font-medium text-foreground mb-2">No images found</p>
            <p className="text-muted-foreground">There are no images in this category yet.</p>
          </div>
        )}

        <section className="mt-20 bg-accent/10 border border-accent/20 rounded-2xl py-16 px-4 text-center">
          <h2 className="text-3xl font-serif font-bold text-foreground mb-4">Ready to Create Your Own Event?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Let us help you bring your vision to life.
          </p>
          <Button 
            size="lg" 
            className="px-8 font-bold" 
            onClick={() => navigate("/customer/book")}
          >
            Get Started Now
          </Button>
        </section>
      </div>

      {lightboxIndex !== null && filteredItems[lightboxIndex] && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button 
            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6" />
          </button>
          
          <button 
            className="absolute left-6 w-14 h-14 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={showPrevious}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <img
            src={filteredItems[lightboxIndex].image_url}
            alt={filteredItems[lightboxIndex].title}
            className="max-h-[90vh] max-w-[90vw] object-contain shadow-2xl rounded-sm"
            onClick={(event) => event.stopPropagation()}
          />
          
          <button 
            className="absolute right-6 w-14 h-14 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={showNext}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
          
          <div className="absolute bottom-6 left-0 right-0 text-center text-white/50 font-medium tracking-widest text-sm">
            {lightboxIndex + 1} / {filteredItems.length}
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}