import React, { useState, useMemo } from "react";
import { 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  HelpCircle, 
  X,
  Package, 
  Calendar, 
  CreditCard, 
  Utensils, 
  ShieldAlert
} from "lucide-react";
import { CATERING_COLLECTIONS } from "../data/cateringHelpData";

const iconMap = {
  Package,
  Calendar,
  CreditCard,
  Utensils,
  ShieldAlert
};

/**
 * Format inline bold tokens (**text**) into strong tags
 */
function formatInlineText(str) {
  if (typeof str !== "string") return str;
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

/**
 * Render FAQ answer body with styled bullet points and bold highlights
 */
function renderFaqContent(text) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-2 my-2">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2C4B8A] mt-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                {formatInlineText(item)}
              </div>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || trimmed.startsWith("• ")) {
      currentList.push(trimmed.replace(/^[-*•]\s+/, ""));
      continue;
    }

    flushList();
    elements.push(
      <p key={`p-${i}`} className="text-xs text-slate-700 leading-relaxed">
        {formatInlineText(trimmed)}
      </p>
    );
  }

  flushList();
  return elements;
}

export default function HelpTab({
  initialSearch = "",
  onAskZelle
}) {
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedFaq, setSelectedFaq] = useState(null);

  // Search filter across topics and FAQs
  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return CATERING_COLLECTIONS;

    return CATERING_COLLECTIONS.map((cat) => {
      const faqsList = cat.faqs || cat.articles || [];
      const matchCat = cat.title.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
      const matchFaqs = faqsList.filter((faq) => 
        faq.title.toLowerCase().includes(q) || 
        faq.summary.toLowerCase().includes(q) || 
        faq.content.toLowerCase().includes(q)
      );

      if (matchCat || matchFaqs.length > 0) {
        return {
          ...cat,
          faqs: matchFaqs.length > 0 ? matchFaqs : faqsList
        };
      }
      return null;
    }).filter(Boolean);
  }, [searchTerm]);

  // ── Sub-View 1: FAQ Detail View ────────────────────────────
  if (selectedFaq) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white font-sans">
        <div className="p-3 px-4 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedFaq(null)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#2C4B8A] transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-[#2C4B8A]" />
            <span>Back to FAQs</span>
          </button>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#2C4B8A]/10 text-[#2C4B8A]">
            FAQ
          </span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900 leading-snug">
              {selectedFaq.title}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedFaq.summary}
            </p>
          </div>

          {/* Formatted Answer Body */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            {renderFaqContent(selectedFaq.content)}
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
              onClick={() => onAskZelle(selectedFaq.relatedPrompt || `Tell me more about ${selectedFaq.title}`)}
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

  // ── Sub-View 2: Topic FAQs List ────────────────────────────
  if (selectedCategory) {
    const topicFaqs = selectedCategory.faqs || selectedCategory.articles || [];

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white font-sans">
        <div className="p-3 px-4 border-b border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#2C4B8A] transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500 group-hover:text-[#2C4B8A]" />
            <span>All Topics</span>
          </button>
          <span className="text-[11px] text-slate-400 font-medium">
            {topicFaqs.length} {topicFaqs.length === 1 ? "FAQ" : "FAQs"}
          </span>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-sm text-slate-900">
            {selectedCategory.title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {selectedCategory.description}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 divide-y divide-slate-100">
          {topicFaqs.map((faq) => (
            <button
              key={faq.id}
              type="button"
              onClick={() => setSelectedFaq(faq)}
              className="w-full py-3.5 text-left group flex items-center justify-between gap-3 hover:text-[#2C4B8A] transition-colors cursor-pointer"
            >
              <div className="space-y-0.5 min-w-0">
                <span className="text-xs font-semibold text-slate-800 group-hover:text-[#2C4B8A] transition-colors block">
                  {faq.title}
                </span>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {faq.summary}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2C4B8A] group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Sub-View 3: Main Topics View ───────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white font-sans">
      {/* Search Bar */}
      <div className="p-4 pb-2">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search catering FAQs..."
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

        {/* Topic count */}
        <div className="pt-3 pb-1">
          <span className="text-xs font-bold text-slate-900">
            {filteredData.length} {filteredData.length === 1 ? "Help Topic" : "Help Topics"}
          </span>
        </div>
      </div>

      {/* Topics List */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 divide-y divide-slate-100">
        {filteredData.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <HelpCircle className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-xs">No FAQs found matching "{searchTerm}"</p>
            <button
              type="button"
              onClick={() => onAskZelle(searchTerm)}
              className="text-xs text-[#2C4B8A] font-semibold underline mt-2 block"
            >
              Ask Zelle AI directly instead
            </button>
          </div>
        ) : (
          filteredData.map((cat) => {
            const Icon = iconMap[cat.icon] || HelpCircle;
            const faqsList = cat.faqs || cat.articles || [];

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className="w-full py-3.5 text-left group flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer px-1 rounded-lg"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-[#2C4B8A] transition-colors block">
                    {cat.title}
                  </span>
                  <p className="text-[11px] text-slate-500 truncate">
                    {cat.description}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium block pt-0.5">
                    {faqsList.length} {faqsList.length === 1 ? "FAQ" : "FAQs"}
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

