import React, { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  Star,
  CheckCircle2,
  AlertTriangle,
  Quote,
  RotateCcw,
  ThumbsUp,
  Award,
  MessageSquare,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { getZelleFeedbackSummary } from "../../../api/zelle";
import useToast from "../../../hooks/useToast";
import { cn } from "@/lib/utils";

export default function ZelleFeedbackInsights({ className = "" }) {
  const { notify } = useToast();
  const [days, setDays] = useState(90);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async (selectedDays = days) => {
    setLoading(true);
    try {
      const res = await getZelleFeedbackSummary(selectedDays);
      setData(res);
    } catch (err) {
      console.error("Failed to load AI feedback insights:", err);
      notify("Could not load AI feedback insights.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(days);
  }, [days]);

  return (
    <div
      className={cn(
        "rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden transition-all",
        className
      )}
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-primary text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-base text-foreground">
                Zelle AI Customer Intelligence
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
              >
                Sentiment & Insights
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Automated review analysis and operational quality assessment
            </p>
          </div>
        </div>

        {/* Time Period Filter & Refresh */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <div className="flex p-0.5 bg-muted/80 rounded-xl border border-border/60">
            <button
              type="button"
              onClick={() => setDays(30)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer",
                days === 30
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              30 Days
            </button>
            <button
              type="button"
              onClick={() => setDays(90)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer",
                days === 90
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              90 Days
            </button>
            <button
              type="button"
              onClick={() => setDays(0)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer",
                days === 0
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Time
            </button>
          </div>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => fetchSummary(days)}
            disabled={loading}
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            title="Refresh AI Analysis"
          >
            <RotateCcw className={cn("w-3.5 h-3.5", loading && "animate-spin text-primary")} />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <Sparkles className="w-7 h-7 text-amber-500 animate-spin" />
            <p className="text-xs text-muted-foreground animate-pulse">
              Zelle is analyzing customer reviews and extracting operational insights...
            </p>
          </div>
        ) : data ? (
          <>
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Average Star Score */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Average Score
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-serif font-bold text-2xl text-foreground">
                      {data.average_rating || "5.0"}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 5.0</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
              </div>

              {/* Total Reviews */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Total Reviews
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-serif font-bold text-2xl text-foreground">
                      {data.total_reviews}
                    </span>
                    <span className="text-xs text-muted-foreground">verified ratings</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>

              {/* Sentiment Ratio */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Customer Sentiment
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {data.sentiment_distribution?.positive_pct || 95}% Positive
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex mt-2">
                  <div
                    style={{ width: `${data.sentiment_distribution?.positive_pct || 90}%` }}
                    className="bg-emerald-500 h-full"
                    title="Positive"
                  />
                  <div
                    style={{ width: `${data.sentiment_distribution?.neutral_pct || 10}%` }}
                    className="bg-amber-400 h-full"
                    title="Neutral"
                  />
                  <div
                    style={{ width: `${data.sentiment_distribution?.negative_pct || 0}%` }}
                    className="bg-rose-500 h-full"
                    title="Negative"
                  />
                </div>
              </div>
            </div>

            {/* Executive AI Summary */}
            {data.executive_summary && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 leading-relaxed text-xs">
                <div className="flex items-center gap-1.5 font-bold text-primary mb-1 text-xs">
                  <Award className="w-4 h-4" />
                  <span>Executive AI Summary</span>
                </div>
                <p className="text-foreground/90">{data.executive_summary}</p>
              </div>
            )}

            {/* Two Column: Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Key Strengths & Customer Praise</span>
                </div>
                <ul className="space-y-2 text-xs">
                  {data.top_strengths?.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-foreground/90 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Opportunities / Action Points */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-600 dark:text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>Action Points & Opportunities</span>
                </div>
                <ul className="space-y-2 text-xs">
                  {data.areas_for_improvement?.map((area, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-foreground/90 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Featured Customer Quotes */}
            {data.featured_quotes?.length > 0 && (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Quote className="w-3.5 h-3.5 text-primary" /> Highlighted Customer Quotes:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {data.featured_quotes.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-card border border-border/50 text-xs italic text-foreground/80 flex items-start gap-2 shadow-2xs"
                    >
                      <Quote className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                      <span>"{q}"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
