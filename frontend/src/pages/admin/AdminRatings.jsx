import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import BusinessInfoPanel from "../../components/admin/BusinessInfoPanel";
import ZelleFeedbackInsights from "../../components/admin/ui/ZelleFeedbackInsights";
import { Star, MessageSquare, Building2, User } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { cn } from "@/lib/utils";

export default function AdminRatings() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ratings");

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";

  useEffect(() => {
    AdminAPI.getRatings()
      .then((res) => setRatings(Array.isArray(res.data) ? res.data : []))
      .catch(() => setRatings([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
              Ratings & Business Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Analyze customer satisfaction, AI sentiment insights, and manage catering business profile
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-0.5 bg-muted/80 rounded-md w-fit border border-border/60">
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer",
              tab === "ratings"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setTab("ratings")}
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            Customer Ratings &amp; AI Analysis
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-all cursor-pointer",
              tab === "info"
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setTab("info")}
          >
            <Building2 className="w-3.5 h-3.5" />
            Business Information
          </button>
        </div>

        {/* Tab 1: Ratings & AI Intelligence */}
        {tab === "ratings" && (
          <div className="space-y-4">
            {/* AI Sentiment & Insights Card */}
            <ZelleFeedbackInsights />

            {/* Individual Reviews Section */}
            <div className="bg-card rounded-lg border border-border/80 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">
                    All Customer Reviews ({ratings.length})
                  </h3>
                </div>
              </div>


              {loading ? (
                <p className="text-xs text-muted-foreground py-8 text-center animate-pulse">
                  Loading customer reviews...
                </p>
              ) : ratings.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs text-muted-foreground">No ratings submitted by customers yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60 space-y-3">
                  {ratings.map((r) => (
                    <div key={r._id} className="pt-3 first:pt-0 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {r.customer_id?.full_name?.slice(0, 2).toUpperCase() || "CU"}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-foreground">
                              {r.customer_id?.full_name || "Customer"}
                            </span>
                            {r.booking_id?._id && (
                              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                                EVT-{String(r.booking_id._id).slice(-6).toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-foreground/90 leading-relaxed">
                            {r.review ? `"${r.review}"` : <span className="italic text-muted-foreground">No written review comment.</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-3 h-3",
                                i < (r.stars || 0)
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-slate-200 dark:text-slate-700"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {formatDate(r.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Business Info */}
        {tab === "info" && <BusinessInfoPanel />}
      </div>
    </AdminLayout>
  );
}