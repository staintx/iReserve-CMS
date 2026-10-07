import React, { useState, useMemo } from "react";
import { 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  FileText, 
  X,
  Package, 
  Calendar, 
  CreditCard, 
  Utensils, 
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATERING_COLLECTIONS } from "../data/cateringHelpData";

const iconMap = {
  Package,
  Calendar,
  CreditCard,
  Utensils,
  ShieldAlert
};

export default function HelpTab({
  initialSearch = "",
  onAskZelle
}) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Search filter across all collections and articles
  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return CATERING_COLLECTIONS;

    return CATERING_COLLECTIONS.map((col) => {
      const matchCol = col.title.toLowerCase().includes(q) || col.description.toLowerCase().includes(q);
      const matchArticles = col.articles.filter((art) => 
        art.title.toLowerCase().includes(q) || 
        art.summary.toLowerCase().includes(q) || 
        art.content.toLowerCase().includes(q)
      );

      if (matchCol || matchArticles.length > 0) {
        return {
          ...col,
          articles: matchArticles.length > 0 ? matchArticles : col.articles
        };
      }
      return null;
    }).filter(Boolean);
  }, [searchTerm]);

  // ── Sub-View 1: Article Detail Reader ─────────────────────
  if (selectedArticle) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white font-sans">
        <div className="p-3 px-4 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedArticle(null)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#2C4B8A] transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-[#2C4B8A]" />
            <span>Back to articles</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 leading-snug">
              {selectedArticle.title}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedArticle.summary}
            </p>
          </div>

          <div className="text-xs text-slate-700 leading-relaxed space-y-2.5 whitespace-pre-line border-t border-slate-100 pt-3">
            {selectedArticle.content}
          </div>

          {/* Prompt Zelle hand-off */}
          <div className="mt-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Need more details on this?</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Zelle AI can check custom estimates, specific dates, or package pricing for you.
            </p>
            <button
              type="button"
              onClick={() => onAskZelle(selectedArticle.relatedPrompt || `Tell me more about ${selectedArticle.title}`)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-[#2C4B8A] hover:bg-[#1E3563] text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>Ask Zelle AI about this</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Sub-View 2: Collection Articles List ──────────────────
  if (selectedCollection) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white font-sans">
        <div className="p-3 px-4 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedCollection(null)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#2C4B8A] transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-[#2C4B8A]" />
            <span>All collections</span>
          </button>
          <span className="text-[11px] text-slate-400 font-medium">
            {selectedCollection.articles.length} articles
          </span>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-sm text-slate-900">
            {selectedCollection.title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedCollection.description}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 divide-y divide-slate-100">
          {selectedCollection.articles.map((art) => (
            <button
              key={art.id}
              type="button"
              onClick={() => setSelectedArticle(art)}
              className="w-full py-3.5 text-left group flex items-center justify-between gap-3 hover:text-[#2C4B8A] transition-colors cursor-pointer"
            >
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-semibold text-slate-800 group-hover:text-[#2C4B8A] transition-colors block">
                  {art.title}
                </span>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {art.summary}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2C4B8A] group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Sub-View 3: Main Collections View (Reference Image 2 & 5) ──
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white font-sans">
      {/* Search Bar */}
      <div className="p-4 pb-2">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for help..."
            className="w-full h-10 pl-3 pr-8 text-xs rounded-xl bg-slate-100/90 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1.5 focus:ring-[#2C4B8A] focus:bg-white transition-all"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          )}
        </div>

        {/* Collections count matching reference */}
        <div className="pt-3 pb-1">
          <span className="text-xs font-bold text-slate-900">
            {filteredData.length} {filteredData.length === 1 ? "collection" : "collections"}
          </span>
        </div>
      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 divide-y divide-slate-100">
        {filteredData.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-xs">No articles found matching "{searchTerm}"</p>
            <button
              type="button"
              onClick={() => onAskZelle(searchTerm)}
              className="text-xs text-[#2C4B8A] font-semibold underline mt-2 block"
            >
              Ask Zelle AI directly instead
            </button>
          </div>
        ) : (
          filteredData.map((col) => {
            const Icon = iconMap[col.icon] || FileText;

            return (
              <button
                key={col.id}
                type="button"
                onClick={() => setSelectedCollection(col)}
                className="w-full py-3.5 text-left group flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer px-1 rounded-lg"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-[#2C4B8A] transition-colors block">
                    {col.title}
                  </span>
                  <p className="text-[11px] text-slate-500 truncate">
                    {col.description}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium block pt-0.5">
                    {col.articles.length} {col.articles.length === 1 ? "article" : "articles"}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2C4B8A] group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
