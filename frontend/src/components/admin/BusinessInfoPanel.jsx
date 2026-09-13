import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  FileText,
  ShieldCheck,
  ExternalLink,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Loader2,
  Truck,
  Plus,
  Trash2,
  Pencil,
  Check,
  UploadCloud,
  Eye,
  File,
  RefreshCw,
  Share2,
  CalendarCheck2,
} from "lucide-react";

const DEFAULT_INFO = {
  contact_number: "",
  email: "",
  address: "",
  pickup_address: "",
  hours: "",
  social_links: [],
  terms_file: null,
  privacy_file: null,
  terms_url: "",
  privacy_url: "",
  facebook: "",
  instagram: "",
  custom_event_setup_price: 15000,
  custom_food_and_event_price: 800,
  max_bookings_per_day: 2,
};

const HOUR_PRESETS = [
  "Mon – Sun: 8:00 AM – 8:00 PM",
  "Mon – Sat: 8:00 AM – 6:00 PM | Sun: Closed",
  "Mon – Fri: 9:00 AM – 6:00 PM | Sat – Sun: 10:00 AM – 4:00 PM",
  "Daily: 9:00 AM – 9:00 PM",
  "Daily: 8:00 AM – 5:00 PM",
];

const detectPlatform = (url = "") => {
  const lower = url.toLowerCase();
  if (lower.includes("facebook.com") || lower.includes("fb.me") || lower.includes("fb.watch")) {
    return { name: "Facebook", key: "facebook", badgeBg: "bg-[#1877F2]/10 text-[#1877F2]" };
  }
  if (lower.includes("instagram.com") || lower.includes("instagr.am")) {
    return { name: "Instagram", key: "instagram", badgeBg: "bg-pink-500/10 text-pink-600" };
  }
  if (lower.includes("twitter.com") || lower.includes("x.com")) {
    return { name: "X (Twitter)", key: "twitter", badgeBg: "bg-neutral-900/10 text-neutral-900 dark:text-neutral-100" };
  }
  if (lower.includes("tiktok.com")) {
    return { name: "TikTok", key: "tiktok", badgeBg: "bg-neutral-900/10 text-neutral-900 dark:text-neutral-100" };
  }
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return { name: "YouTube", key: "youtube", badgeBg: "bg-red-500/10 text-red-600" };
  }
  if (lower.includes("linkedin.com")) {
    return { name: "LinkedIn", key: "linkedin", badgeBg: "bg-blue-600/10 text-blue-600" };
  }
  if (lower.includes("pinterest.com")) {
    return { name: "Pinterest", key: "pinterest", badgeBg: "bg-red-600/10 text-red-600" };
  }
  if (lower.includes("threads.net")) {
    return { name: "Threads", key: "threads", badgeBg: "bg-neutral-900/10 text-neutral-900 dark:text-neutral-100" };
  }
  return { name: "Website", key: "generic", badgeBg: "bg-primary/10 text-primary" };
};

function PlatformIcon({ platform, className = "w-4 h-4" }) {
  switch (platform) {
    case "facebook":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "instagram":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case "twitter":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );
    case "youtube":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      );
    default:
      return <Globe className={className} />;
  }
}

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function BusinessInfoPanel() {
  const [form, setForm] = useState(DEFAULT_INFO);
  const [initialForm, setInitialForm] = useState(DEFAULT_INFO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPickupAddress, setShowPickupAddress] = useState(false);

  // Online Presence Link Manager State
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingUrl, setEditingUrl] = useState("");

  // Policies File Upload State
  const [uploadingTerms, setUploadingTerms] = useState(false);
  const [uploadingPrivacy, setUploadingPrivacy] = useState(false);
  const termsInputRef = useRef(null);
  const privacyInputRef = useRef(null);

  const { notify } = useToast();

  const loadData = useCallback(() => {
    AdminAPI.getBusinessInfo()
      .then((res) => {
        const raw = res.data || {};
        const data = { ...DEFAULT_INFO, ...raw };

        // Normalize social_links array
        let links = Array.isArray(raw.social_links) ? raw.social_links : [];
        if (links.length === 0) {
          if (raw.facebook && raw.facebook.trim()) {
            links.push({ platform: "facebook", url: raw.facebook.trim() });
          }
          if (raw.instagram && raw.instagram.trim()) {
            links.push({ platform: "instagram", url: raw.instagram.trim() });
          }
        }
        data.social_links = links;

        // Normalize policies
        if (!data.terms_file && data.terms_url) {
          data.terms_file = {
            url: data.terms_url,
            name: data.terms_url.split("/").pop() || "Terms & Conditions Document",
            type: "PDF",
            size: 0,
          };
        }
        if (!data.privacy_file && data.privacy_url) {
          data.privacy_file = {
            url: data.privacy_url,
            name: data.privacy_url.split("/").pop() || "Privacy Policy Document",
            type: "PDF",
            size: 0,
          };
        }

        setForm(data);
        setInitialForm(data);
        if (data.pickup_address && data.pickup_address.trim().length > 0) {
          setShowPickupAddress(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealTimeRefresh(loadData);

  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const updateField = (key) => (event) => {
    const val = event.target.value;
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    setForm(initialForm);
    setIsAddingLink(false);
    setNewLinkUrl("");
    setEditingIndex(-1);
    notify("Changes discarded.", "info");
  };

  const formatExternalUrl = (url) => {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleTestLink = (url) => {
    const target = formatExternalUrl(url);
    if (target) {
      window.open(target, "_blank", "noopener,noreferrer");
    }
  };

  // ── Online Presence Handlers ──
  const handleConfirmAddLink = () => {
    const trimmed = newLinkUrl.trim();
    if (!trimmed) return;
    const detected = detectPlatform(trimmed);
    const updatedLinks = [
      ...(form.social_links || []),
      { platform: detected.key, url: trimmed },
    ];
    setForm((prev) => ({ ...prev, social_links: updatedLinks }));
    setNewLinkUrl("");
    setIsAddingLink(false);
  };

  const handleStartEdit = (index) => {
    setEditingIndex(index);
    setEditingUrl(form.social_links[index]?.url || "");
  };

  const handleSaveEdit = (index) => {
    const trimmed = editingUrl.trim();
    if (!trimmed) return;
    const detected = detectPlatform(trimmed);
    const updated = [...form.social_links];
    updated[index] = { platform: detected.key, url: trimmed };
    setForm((prev) => ({ ...prev, social_links: updated }));
    setEditingIndex(-1);
    setEditingUrl("");
  };

  const handleRemoveLink = (index) => {
    const updated = form.social_links.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, social_links: updated }));
    if (editingIndex === index) {
      setEditingIndex(-1);
    }
  };

  // ── Policies Document Upload Handlers ──
  const handleFileUpload = async (file, policyType) => {
    if (!file) return;

    const allowed = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp", ".txt"];
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!allowed.includes(ext)) {
      notify(`Unsupported file format (${ext}). Please select a PDF, Word document, or image file.`, "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    if (policyType === "terms") setUploadingTerms(true);
    else setUploadingPrivacy(true);

    try {
      const res = await AdminAPI.uploadPolicyDoc(formData);
      if (res.data) {
        const uploaded = res.data;
        if (policyType === "terms") {
          setForm((prev) => ({
            ...prev,
            terms_file: uploaded,
            terms_url: uploaded.url,
          }));
          notify("Terms and Conditions document uploaded.", "success");
        } else {
          setForm((prev) => ({
            ...prev,
            privacy_file: uploaded,
            privacy_url: uploaded.url,
          }));
          notify("Privacy Policy document uploaded.", "success");
        }
      }
    } catch (err) {
      notify(
        err.response?.data?.message || "Failed to upload file. Please try again.",
        "error"
      );
    } finally {
      if (policyType === "terms") setUploadingTerms(false);
      else setUploadingPrivacy(false);
    }
  };

  const handleRemovePolicyDoc = (policyType) => {
    if (policyType === "terms") {
      setForm((prev) => ({ ...prev, terms_file: null, terms_url: "" }));
      notify("Terms & Conditions document removed.", "info");
    } else {
      setForm((prev) => ({ ...prev, privacy_file: null, privacy_url: "" }));
      notify("Privacy Policy document removed.", "info");
    }
  };

  const save = async (event) => {
    if (event) event.preventDefault();
    setSaving(true);

    try {
      await AdminAPI.updateBusinessInfo(form);
      setInitialForm(form);
      notify("Business information successfully updated.", "success");
    } catch (err) {
      notify(
        err.response?.data?.message || "Could not save business info. Please try again.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 rounded-xl border border-border/60 bg-card text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading business information...</p>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {/* Top Action & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/70 shadow-xs">
        <div className="flex items-center gap-3">
          {isDirty ? (
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1.5 py-1 px-3 text-xs font-semibold"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Unsaved changes
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1.5 py-1 px-3 text-xs font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Published &amp; Up to date
            </Badge>
          )}
          <span className="text-xs text-muted-foreground hidden md:inline">
            Updates reflect across the customer website, quotes, and order invoices.
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isDirty && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={saving}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Discard
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={saving || !isDirty}
            className="cursor-pointer font-medium px-4 shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Responsive Two-Column Bento Layout (No large blank gaps, independent vertical flow) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ══════════════════════════════════════════════════════════
            LEFT COLUMN: Business Contact Information + Policies & Legal
           ══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-6">
          {/* ── Business Contact Information ────────────────────────── */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold tracking-tight">
                    Business Contact Information
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Official contact phone number, email address, and physical business location.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {/* Phone & Email side by side in a balanced 2-column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="contact-number"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    Phone Number
                  </Label>
                  <Input
                    id="contact-number"
                    type="tel"
                    value={form.contact_number}
                    onChange={updateField("contact_number")}
                    placeholder="e.g. +63 912 345 6789"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="email-address"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    Email Address
                  </Label>
                  <Input
                    id="email-address"
                    type="email"
                    value={form.email}
                    onChange={updateField("email")}
                    placeholder="e.g. contact@caezelle.com"
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Location / Physical Address (Full Width) */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="business-address"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Location / Business Address
                </Label>
                <Textarea
                  id="business-address"
                  rows={3}
                  value={form.address}
                  onChange={updateField("address")}
                  placeholder="e.g. 143 Feast Avenue, Brgy. San Antonio, Pasig City, Metro Manila"
                  className="bg-background resize-y text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Displayed in the public landing page footer, quotation sheets, and official receipts.
                </p>
              </div>

              {/* Optional Pickup Address Accordion/Toggle */}
              <div className="pt-2 border-t border-border/40">
                {!showPickupAddress ? (
                  <button
                    type="button"
                    onClick={() => setShowPickupAddress(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    + Add separate pickup / kitchen location (optional)
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="pickup-address"
                        className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5 text-primary" />
                        Pickup / Commissary Address
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((p) => ({ ...p, pickup_address: "" }));
                          setShowPickupAddress(false);
                        }}
                        className="text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                    <Textarea
                      id="pickup-address"
                      rows={2}
                      value={form.pickup_address}
                      onChange={updateField("pickup_address")}
                      placeholder="Address where customers collect pickup orders (leave blank to default to main address)"
                      className="bg-background text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Shown specifically to customers who select "Customer Pickup" in the booking wizard.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Policies & Legal (Positioned on the LEFT side) ───────── */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold tracking-tight">
                    Policies &amp; Legal
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Upload official legal agreements, cancellation policies, and manage capacity rules.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              {/* 1. Terms & Conditions Document Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Terms &amp; Conditions Document
                  </Label>
                  {form.terms_file?.url && (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Uploaded
                    </span>
                  )}
                </div>

                <input
                  ref={termsInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0], "terms");
                      e.target.value = "";
                    }
                  }}
                />

                {uploadingTerms ? (
                  <div className="p-6 rounded-xl border border-border/80 bg-muted/30 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-xs font-medium text-foreground">Uploading Terms &amp; Conditions...</p>
                  </div>
                ) : form.terms_file?.url ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/20 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                        <File className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-[240px]">
                          {form.terms_file.name || "Terms & Conditions"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0">
                            {form.terms_file.type || "DOC"}
                          </Badge>
                          {form.terms_file.size > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatFileSize(form.terms_file.size)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTestLink(form.terms_file.url)}
                        title="View Document"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => termsInputRef.current?.click()}
                        title="Replace Document"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePolicyDoc("terms")}
                        title="Remove Document"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => termsInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) {
                        handleFileUpload(e.dataTransfer.files[0], "terms");
                      }
                    }}
                    className="rounded-xl border-2 border-dashed border-border/80 p-5 text-center bg-muted/20 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-7 h-7 text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-foreground">Upload Terms &amp; Conditions Document</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Drag and drop file here or click to browse
                    </p>
                    <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                      Supported: PDF, DOC, DOCX, JPG, PNG (Max 15MB)
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Privacy Policy Document Upload */}
              <div className="space-y-2 pt-1 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Privacy Policy Document
                  </Label>
                  {form.privacy_file?.url && (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Uploaded
                    </span>
                  )}
                </div>

                <input
                  ref={privacyInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0], "privacy");
                      e.target.value = "";
                    }
                  }}
                />

                {uploadingPrivacy ? (
                  <div className="p-6 rounded-xl border border-border/80 bg-muted/30 flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-xs font-medium text-foreground">Uploading Privacy Policy...</p>
                  </div>
                ) : form.privacy_file?.url ? (
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/20 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <File className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-[240px]">
                          {form.privacy_file.name || "Privacy Policy"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0">
                            {form.privacy_file.type || "DOC"}
                          </Badge>
                          {form.privacy_file.size > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatFileSize(form.privacy_file.size)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTestLink(form.privacy_file.url)}
                        title="View Document"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => privacyInputRef.current?.click()}
                        title="Replace Document"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePolicyDoc("privacy")}
                        title="Remove Document"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => privacyInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files?.[0]) {
                        handleFileUpload(e.dataTransfer.files[0], "privacy");
                      }
                    }}
                    className="rounded-xl border-2 border-dashed border-border/80 p-5 text-center bg-muted/20 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-7 h-7 text-muted-foreground mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-foreground">Upload Privacy Policy Document</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Drag and drop file here or click to browse
                    </p>
                    <span className="text-[10px] text-muted-foreground/80 mt-1 block">
                      Supported: PDF, DOC, DOCX, JPG, PNG (Max 15MB)
                    </span>
                  </div>
                )}
              </div>

              {/* Booking Capacity Rule */}
              <div className="pt-2 border-t border-border/40 space-y-1.5">
                <Label
                  htmlFor="max-bookings"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
                >
                  <CalendarCheck2 className="w-3.5 h-3.5 text-primary" />
                  Max Bookings Allowed Per Day
                </Label>
                <Input
                  id="max-bookings"
                  type="number"
                  min="1"
                  max="50"
                  value={form.max_bookings_per_day ?? 2}
                  onChange={updateField("max_bookings_per_day")}
                  placeholder="2"
                  className="bg-background w-32 font-medium"
                />
                <p className="text-[11px] text-muted-foreground">
                  The booking engine uses this capacity threshold to automatically close calendar dates once reaching max intake.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════
            RIGHT COLUMN: Business Hours + Online Presence
           ══════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-6">
          {/* ── Business Hours ─────────────────────────────────────── */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold tracking-tight">
                    Business Hours
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Define your customer service schedule and daily catering operating times.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {/* Opening Hours Input */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="business-hours"
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Opening Hours
                </Label>
                <Input
                  id="business-hours"
                  value={form.hours}
                  onChange={updateField("hours")}
                  placeholder="e.g. Mon – Sun: 8:00 AM – 8:00 PM"
                  className="bg-background font-medium"
                />
                <p className="text-[11px] text-muted-foreground">
                  Enter your standard operational hours or select from the common presets below.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Quick Schedule Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {HOUR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, hours: preset }))}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                        form.hours === preset
                          ? "bg-primary text-primary-foreground border-primary font-medium"
                          : "bg-muted/50 text-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Display View Box */}
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2 mt-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Customer Website Display</span>
                </div>
                <div className="flex items-center justify-between text-xs bg-background p-2.5 rounded-md border border-border/50">
                  <span className="text-muted-foreground">Operating Schedule:</span>
                  <span className="font-semibold text-foreground">
                    {form.hours?.trim() ? form.hours : "Hours not specified"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  This formatted text appears in the website header, footer, and automated booking notifications.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── Online Presence (Positioned on the RIGHT side) ───────── */}
          <Card className="border-border/70 shadow-xs bg-card">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold tracking-tight">
                      Online Presence
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Connect social media profiles and links so visitors can follow your brand.
                    </CardDescription>
                  </div>
                </div>

                {!isAddingLink && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingLink(true)}
                    className="cursor-pointer gap-1 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Links
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {/* If adding a link, display the new input row */}
              {isAddingLink && (
                <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">
                      Add Social Media or Website Link
                    </Label>
                    {newLinkUrl.trim() && (
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${detectPlatform(newLinkUrl).badgeBg}`}>
                        {detectPlatform(newLinkUrl).name}
                      </Badge>
                    )}
                  </div>

                  <Input
                    type="url"
                    autoFocus
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirmAddLink();
                      }
                    }}
                    placeholder="Paste URL (e.g. https://facebook.com/yourpage or https://instagram.com/...)"
                    className="bg-background text-sm"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsAddingLink(false);
                        setNewLinkUrl("");
                      }}
                      className="text-xs cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleConfirmAddLink}
                      disabled={!newLinkUrl.trim()}
                      className="text-xs cursor-pointer gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Done
                    </Button>
                  </div>
                </div>
              )}

              {/* List of saved social links */}
              {form.social_links && form.social_links.length > 0 ? (
                <div className="space-y-2.5">
                  {form.social_links.map((link, index) => {
                    const platformInfo = detectPlatform(link.url);
                    const isEditingThis = editingIndex === index;

                    if (isEditingThis) {
                      return (
                        <div
                          key={index}
                          className="p-3.5 rounded-lg border border-primary/40 bg-card space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">Edit Link</span>
                            <Badge variant="outline" className={`text-[10px] ${detectPlatform(editingUrl).badgeBg}`}>
                              {detectPlatform(editingUrl).name}
                            </Badge>
                          </div>
                          <Input
                            type="url"
                            autoFocus
                            value={editingUrl}
                            onChange={(e) => setEditingUrl(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveEdit(index);
                              }
                            }}
                            className="bg-background text-sm"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingIndex(-1);
                                setEditingUrl("");
                              }}
                              className="text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveEdit(index)}
                              disabled={!editingUrl.trim()}
                              className="text-xs gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Done
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/30 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${platformInfo.badgeBg}`}
                          >
                            <PlatformIcon platform={platformInfo.key} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">
                                {platformInfo.name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[280px]">
                              {link.url}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTestLink(link.url)}
                            title="Open Link"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(index)}
                            title="Edit Link"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveLink(index)}
                            title="Remove Link"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !isAddingLink && (
                  <div className="rounded-xl border border-dashed border-border/80 p-8 text-center bg-muted/20">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 text-muted-foreground">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">No social links added yet</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs mx-auto">
                      Click "Add Links" to connect your Facebook, Instagram, TikTok, YouTube, or website.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddingLink(true)}
                      className="mt-3 cursor-pointer text-xs gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Links
                    </Button>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Sticky/Inline Save Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/70 shadow-xs">
        <p className="text-xs text-muted-foreground m-0">
          All changes saved here will immediately update the customer-facing website and quote calculator.
        </p>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isDirty && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={saving}
              className="text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Discard Changes
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={saving || !isDirty}
            className="cursor-pointer font-semibold px-5 shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
