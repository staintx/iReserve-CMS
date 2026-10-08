import React, { useState } from "react";
import { 
  CheckCircle2, 
  Search, 
  ChevronRight, 
  Sparkles, 
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATERING_QUICK_SHORTCUTS } from "../data/cateringHelpData";

const GUIDE_STEPS = [
  {
    step: 1,
    title: "Browse catering packages & buffet options",
    desc: "Explore buffet tiers, inclusions, and combo meals tailored to your headcount.",
    actionPrompt: "Show me popular catering packages and inclusions"
  },
  {
    step: 2,
    title: "Check event date availability with Zelle",
    desc: "Ask Zelle AI anytime to check if your date is open on our kitchen calendar.",
    actionPrompt: "Check if my target event date is available"
  },
  {
    step: 3,
    title: "Customize viands & request food tasting",
    desc: "Pick your preferred beef, pork, chicken, and dessert stations.",
    actionPrompt: "How can I customize my menu and schedule a food tasting?"
  },
  {
    step: 4,
    title: "Submit inquiry & lock reservation",
    desc: "Review your coordinator quote and secure your date with a reservation deposit.",
    actionPrompt: "Help me draft an official catering inquiry"
  }
];

export default function HomeTab({
  user,
  onStartChat,
  onOpenHelpSearch,
  onSelectShortcut
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem("ireserve_guide_step");
    return saved ? parseInt(saved, 10) : 1;
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onOpenHelpSearch(searchTerm.trim());
    }
  };

  const handleStepChange = (nextStep) => {
    setCurrentStep(nextStep);
    localStorage.setItem("ireserve_guide_step", nextStep.toString());
  };

  const activeStepData = GUIDE_STEPS[currentStep - 1] || GUIDE_STEPS[0];
  const progressPercent = Math.round((currentStep / GUIDE_STEPS.length) * 100);

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3.5 bg-slate-50/60 font-sans">
      {/* ── 1. Status Card ────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs flex items-center gap-3 transition-all hover:border-slate-300">
        <div className="w-9 h-9 rounded-full bg-[#2C4B8A]/10 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-[#2C4B8A]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-slate-900 tracking-tight">
              Status: Catering Bookings Active
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-[#2C4B8A] animate-pulse" />
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            Open for 2026–2027 Weddings, Debuts & Gatherings
          </p>
        </div>
      </div>

      {/* ── 2. Search & Quick Help Links Card ─────────────────── */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2.5">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for help..."
            className="w-full h-9 pl-3 pr-8 text-xs rounded-lg bg-slate-100/80 border border-slate-200/70 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1.5 focus:ring-[#2C4B8A] focus:bg-white transition-all"
          />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Shortcuts list matching reference */}
        <div className="divide-y divide-slate-100 pt-1">
          {CATERING_QUICK_SHORTCUTS.slice(0, 4).map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectShortcut(item.prompt)}
              className="w-full flex items-center justify-between py-2 text-left group hover:text-[#2C4B8A] transition-colors cursor-pointer"
            >
              <span className="text-xs text-slate-700 font-medium group-hover:text-[#2C4B8A] transition-colors">
                {item.label}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2C4B8A] group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. "Ask a question" Card (Direct Launch into Chat) ── */}
      <div 
        onClick={() => onStartChat()}
        className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-[#2C4B8A]/40 transition-all cursor-pointer group flex items-center justify-between gap-3"
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-slate-900 group-hover:text-[#2C4B8A] transition-colors">
              Ask a question
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          </div>
          <p className="text-[11px] text-slate-500">
            Zelle AI & staff coordinators can help
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#2C4B8A]/10 text-[#2C4B8A] flex items-center justify-center shrink-0 group-hover:bg-[#2C4B8A] group-hover:text-white transition-all shadow-2xs">
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* ── 4. "Learn How to use iReserve" Card (Matching Screenshot) ── */}
      <div 
        onClick={() => setIsGuideOpen(!isGuideOpen)}
        className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all cursor-pointer group space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-slate-900 group-hover:text-[#2C4B8A] transition-colors">
            Learn How to use iReserve
          </span>
          <ChevronRight className={cn(
            "w-4 h-4 text-slate-400 group-hover:text-[#2C4B8A] transition-transform shrink-0",
            isGuideOpen ? "rotate-90" : "group-hover:translate-x-0.5"
          )} />
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
            <span>{currentStep} of {GUIDE_STEPS.length} done • About 2 minutes left</span>
            <span className="font-semibold text-[#2C4B8A]">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#2C4B8A] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <p className="text-[11px] text-slate-600 pt-0.5">
          <span className="font-bold text-slate-800">Next step: </span>
          <span className="text-slate-600 truncate">{activeStepData?.title}</span>
        </p>

        {/* ── Simple In-place Guide Popdown when expanded ── */}
        {isGuideOpen && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="pt-2.5 mt-2.5 border-t border-slate-100 space-y-2.5 animate-in fade-in duration-200"
          >
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-[#2C4B8A]">
                Step {currentStep}: {activeStepData?.title}
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeStepData?.desc}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleStepChange(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
              >
                Previous
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStartChat(activeStepData?.actionPrompt)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <span>Ask Zelle</span>
                  <Sparkles className="w-3 h-3 text-amber-300" />
                </button>

                {currentStep < GUIDE_STEPS.length ? (
                  <button
                    type="button"
                    onClick={() => handleStepChange(currentStep + 1)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-2xs cursor-pointer"
                  >
                    Done & Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsGuideOpen(false)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#2C4B8A] hover:bg-[#1E3563] text-white shadow-2xs cursor-pointer"
                  >
                    Complete!
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
