import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Sparkles,
  UploadCloud,
  FileText,
  File as FileIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  CheckSquare,
  Square,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Info,
  Package,
  Calendar,
  Users,
  Tag,
  Check,
  RotateCcw,
} from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

/**
 * `AIPackageParserModal`
 * Supports:
 * 1. Single Package Ingestion (auto-filling the open PackageModal editor)
 * 2. Multi-Package / Multi-Page Brochure Batch Ingestion (reviewing & importing multiple packages at once)
 */
export default function AIPackageParserModal({
  isOpen,
  onClose,
  onParsed,
  onBulkSuccess,
  offerType = "regular",
  standalone = false,
}) {
  const [activeTab, setActiveTab] = useState("file"); // 'file' or 'text'
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Multi-package review state
  const [extractedPackages, setExtractedPackages] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [expandedIndices, setExpandedIndices] = useState(new Set());
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [step, setStep] = useState("upload"); // 'upload' | 'review'

  const fileInputRef = useRef(null);
  const { notify } = useToast();

  const parsingSteps = [
    "Uploading document...",
    "Zelle AI is reading the pages and prices...",
    "Organizing package options and inclusions...",
    "Almost ready for your review...",
  ];

  // Rotate loading step messages
  useEffect(() => {
    let interval;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % parsingSteps.length);
      }, 1600);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !loading && !isBulkImporting) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, isBulkImporting]);

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(null);
    setTextInput("");
    setExtractedPackages([]);
    setSelectedIndices(new Set());
    setExpandedIndices(new Set());
    setStep("upload");
    setLoading(false);
    setIsBulkImporting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      notify("Invalid file type. Please upload a PNG, JPG, WEBP, or PDF.", "error");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      notify("File exceeds 10MB limit. Please upload a smaller file.", "error");
      return;
    }

    setFile(selectedFile);

    if (selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLoadSampleText = () => {
    const sample = `PAGE 1: BIRTHDAY EVENT SETUP
Size: 20x20
Price: ₱15,000 - ₱17,000
Inclusions:
- [Event Setup & Furniture] Stage Setup, Buffet Setup, Balloon and Name Backdrop, Couch, Round Tables (6), Monoblock Chairs (60), Industrial Fan, Water Station
- [Dining & Service Inventory] Food Warmer (7), Serving Spoons, Plates (150), Glasses (6 trays), Ice Cooler, Staff / Crew (4)
ADDS ON: Standee, Candy Corner, Host, Clown, Cake, Videoke, Basic Lights & Sounds

PAGE 2: BIRTHDAY EVENT SETUP
Size: 20x40
Price: ₱20,000
Inclusions:
- [Event Setup & Furniture] Stage Setup, Buffet Setup, Couch, Round Tables (8), Monoblock Chairs (80), Industrial Fan, Water Station
- [Dining & Service Inventory] Food Warmer (7), Plates (150), Staff / Crew (5)
ADDS ON: Standee, Host, Cake, Videoke

PAGE 4: WEDDING EVENT SETUP
Size: 20x40
Price: ₱30,000
Inclusions:
- [Event Setup & Furniture] Stage & Backdrop Setup, Separate Dining Setup for VIP, Entourage Setup, Couch, Round Tables (10), Monoblock Chairs (100), Tiffany Chairs (20), Dove, Red Carpet
- [Dining & Service Inventory] Food Warmer (7), Cutlery Sets (200), Plates (200), Staff / Crew (6)
ADDS ON: Basic Lights & Sounds, Pica-Pica Station, Host, Cake & Wine, Videoke`;
    setTextInput(sample);
  };

  const handleSubmit = async () => {
    if (activeTab === "file" && !file) {
      notify("Please select a file or brochure to parse.", "error");
      return;
    }
    if (activeTab === "text" && !textInput.trim()) {
      notify("Please paste package details or text to parse.", "error");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      if (activeTab === "file") {
        formData.append("file", file);
      } else {
        formData.append("text", textInput);
      }
      formData.append("offer_type", offerType);

      const res = await AdminAPI.parsePackageWithAI(formData);
      const pkgs = Array.isArray(res.data.packages)
        ? res.data.packages
        : res.data
        ? [res.data]
        : [];

      if (pkgs.length === 0) {
        notify("No package details could be extracted. Please try another document.", "warning");
        setLoading(false);
        return;
      }

      // If exactly 1 package and NOT standalone (opened directly in PackageModal to auto-fill)
      if (pkgs.length === 1 && !standalone && onParsed) {
        notify("Package details extracted successfully!", "success");
        onParsed(pkgs[0]);
        handleClose();
        return;
      }

      // Multi-package result or standalone mode -> Show Review & Batch Import Screen
      setExtractedPackages(pkgs);
      setSelectedIndices(new Set(pkgs.map((_, i) => i)));
      setExpandedIndices(new Set([0])); // Expand first card by default
      setStep("review");
      notify(`Extracted ${pkgs.length} package${pkgs.length > 1 ? "s" : ""} from document!`, "success");
    } catch (error) {
      console.error(error);
      notify(
        error.response?.data?.error ||
          error.response?.data?.message ||
          "Failed to extract package details with AI.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIndices.size === extractedPackages.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(extractedPackages.map((_, i) => i)));
    }
  };

  const handleToggleIndex = (idx) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedIndices(next);
  };

  const handleToggleExpand = (idx) => {
    const next = new Set(expandedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setExpandedIndices(next);
  };

  const handleSelectSingleForEditor = (pkg) => {
    if (onParsed) {
      onParsed(pkg);
      notify(`Loaded "${pkg.name}" into package editor`, "success");
      handleClose();
    }
  };

  const handlePackageNameChange = (idx, newName) => {
    const next = [...extractedPackages];
    next[idx] = { ...next[idx], name: newName };
    setExtractedPackages(next);
  };

  const handleBulkImport = async () => {
    const selected = extractedPackages.filter((_, i) => selectedIndices.has(i));
    if (selected.length === 0) {
      notify("Please select at least one package to import.", "warning");
      return;
    }

    setIsBulkImporting(true);
    try {
      await AdminAPI.createBulkPackages(selected);
      notify(`Successfully imported ${selected.length} packages into your catalog!`, "success");
      if (onBulkSuccess) {
        onBulkSuccess();
      }
      handleClose();
    } catch (error) {
      console.error(error);
      notify(
        error.response?.data?.message ||
          error.response?.data?.error ||
          "Failed to import packages.",
        "error"
      );
    } finally {
      setIsBulkImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full flex flex-col rounded-lg bg-white shadow-2xl border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-200 ${
          step === "review" ? "max-w-3xl max-h-[90vh]" : "max-w-xl"
        }`}

        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Ambient Glow */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/70 to-white">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2">
              <Sparkles size={12} className="text-indigo-600" />
              <span>Powered by Zelle AI</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {step === "review"
                ? `Review Packages Found by Zelle (${extractedPackages.length})`
                : "Import Packages with Zelle AI"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-lg">
              {step === "review"
                ? "Check the package details below before saving them to your list."
                : "Upload a PDF brochure, flyer, or paste text. Zelle AI will read it and create your packages automatically."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading || isBulkImporting}
            className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Upload Step */}
        {step === "upload" && (
          <>
            {/* Segmented Tab Switcher */}
            <div className="px-6 pt-4 pb-2">
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setActiveTab("file")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "file"
                      ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/70"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UploadCloud size={16} />
                  <span>Upload Document / PDF</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setActiveTab("text")}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "text"
                      ? "bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/70"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText size={16} />
                  <span>Paste Raw Text</span>
                </button>
              </div>
            </div>

            {/* Main Upload Content Area */}
            <div className="p-6 pt-2">
              {loading ? (
                /* Enhanced AI Scanner Animation */
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl bg-gradient-to-b from-indigo-50/40 via-violet-50/20 to-white border border-indigo-100/80 text-center">
                  <div className="relative mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white animate-pulse">
                      <Sparkles size={28} className="animate-spin-slow" />
                    </div>
                    <div className="absolute -inset-2 rounded-3xl bg-indigo-500/15 blur-md -z-10 animate-pulse" />
                  </div>

                  <h4 className="text-base font-bold text-slate-800">
                    Zelle AI is Reading Your Document
                  </h4>
                  <p className="text-xs text-indigo-600 font-medium mt-1 min-h-[20px] transition-all duration-300">
                    {parsingSteps[loadingStep]}
                  </p>

                  <div className="w-64 h-1.5 bg-slate-200 rounded-full mt-5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-full animate-progress" />
                  </div>

                  <span className="text-[11px] text-slate-400 mt-3">
                    Finding all packages and event setups...
                  </span>
                </div>
              ) : activeTab === "file" ? (
                /* Upload File Dropzone */
                <div className="flex flex-col gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  />

                  {!file ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`group relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                        isDragging
                          ? "border-indigo-500 bg-indigo-50/60 scale-[0.99]"
                          : "border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200/80 flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:border-indigo-200 transition-all duration-200 mb-3">
                        <UploadCloud size={24} />
                      </div>

                      <p className="text-sm font-semibold text-slate-800 text-center">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 text-center mt-1">
                        Multi-page PDF brochures, flyers, or quotation catalogs
                      </p>

                      <div className="flex items-center gap-1.5 mt-4">
                        {["Multi-Page PDF", "PNG", "JPG", "WEBP"].map((badge) => (
                          <span
                            key={badge}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200/70"
                          >
                            {badge}
                          </span>
                        ))}
                        <span className="text-[11px] text-slate-400 ml-1">Up to 10MB</span>
                      </div>
                    </div>
                  ) : (
                    /* Selected File Card */
                    <div className="flex items-center justify-between p-4 rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/50 to-blue-50/30">
                      <div className="flex items-center gap-3 min-w-0">
                        {filePreview ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-indigo-200 bg-white shrink-0">
                            <img
                              src={filePreview}
                              alt="preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-indigo-200 flex items-center justify-center text-red-500 shrink-0">
                            <FileIcon size={24} />
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {file.name}
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0">
                              <CheckCircle2 size={10} /> Ready
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB •{" "}
                            {file.type === "application/pdf" ? "PDF Document (Multi-page supported)" : "Image File"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Paste Raw Text Tab */
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Raw Package Notes / Text
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleLoadSampleText}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        Load Multi-Package Sample
                      </button>
                      {textInput && (
                        <button
                          type="button"
                          onClick={() => setTextInput("")}
                          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    className="w-full h-44 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 focus:outline-none transition-all resize-none"
                    placeholder={`Example:\nPage 1: Birthday Setup 20x20 - ₱15,000\nPage 2: Birthday Setup 20x40 - ₱20,000\nPage 4: Wedding Setup 40x40 - ₱50,000`}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>Supports multi-page OCR, price lists, or catalog transcripts</span>
                    <span>{textInput.length} chars</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Info size={13} className="text-slate-400" />
                <span>All extracted packages can be reviewed before saving</span>
              </div>

              <div className="flex items-center gap-2">
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={handleClose}
                  disabled={loading}
                  className="text-xs"
                >
                  Cancel
                </Btn>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    loading ||
                    (activeTab === "file" && !file) ||
                    (activeTab === "text" && !textInput.trim())
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Sparkles size={14} className={loading ? "animate-spin" : ""} />
                  <span>{loading ? "Reading Document..." : "Read with Zelle AI"}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Review & Batch Import Step */}
        {step === "review" && (
          <>
            {/* Toolbar for Selection */}
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {selectedIndices.size === extractedPackages.length ? (
                  <CheckSquare size={16} className="text-indigo-600" />
                ) : (
                  <Square size={16} className="text-slate-400" />
                )}
                <span>
                  Select All ({selectedIndices.size}/{extractedPackages.length} selected)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStep("upload")}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Re-upload Document</span>
              </button>
            </div>

            {/* Scrollable Package Cards List */}
            <div className="p-6 overflow-y-auto max-h-[58vh] space-y-4">
              {extractedPackages.map((pkg, idx) => {
                const isSelected = selectedIndices.has(idx);
                const isExpanded = expandedIndices.has(idx);

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isSelected
                        ? "border-indigo-300 bg-white shadow-sm ring-1 ring-indigo-200"
                        : "border-slate-200 bg-slate-50/50 opacity-75"
                    }`}
                  >
                    {/* Card Top Header */}
                    <div className="p-4 flex items-start justify-between gap-3 bg-white">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleIndex(idx)}
                          className="mt-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-indigo-600" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={pkg.name || ""}
                              onChange={(e) => handlePackageNameChange(idx, e.target.value)}
                              className="text-sm font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 -mx-1 py-0.5 rounded transition-all max-w-sm"
                              placeholder="Package Name"
                            />
                            {pkg.event_type && (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-violet-50 text-violet-700 border border-violet-200">
                                {pkg.event_type}
                              </span>
                            )}
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                              {pkg.package_type || "Event Setup"}
                            </span>
                          </div>

                          {pkg.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                              {pkg.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Meta Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-black text-indigo-600">
                            ₱{Number(pkg.setup_price || 0).toLocaleString()}
                          </span>
                          {pkg.price_label && pkg.price_label !== `₱${Number(pkg.setup_price || 0).toLocaleString()}` && (
                            <p className="text-[10px] font-medium text-slate-400">
                              {pkg.price_label}
                            </p>
                          )}
                        </div>

                        {onParsed && (
                          <button
                            type="button"
                            onClick={() => handleSelectSingleForEditor(pkg)}
                            className="px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/80 cursor-pointer"
                            title="Auto-fill open editor with this package"
                          >
                            Fill Form
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleExpand(idx)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Quick Specs Grid */}
                    <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-slate-400" />
                        <span>
                          {pkg.guest_min || 0} - {pkg.guest_max || 0} pax
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Layers size={13} className="text-slate-400" />
                        <span>
                          {pkg.scaffold_size_options?.[0]?.label || "Standard Size"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Package size={13} className="text-slate-400" />
                        <span>{pkg.inclusions?.length || 0} Inclusions</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Tag size={13} className="text-slate-400" />
                        <span>{pkg.add_ons?.length || 0} Add-ons</span>
                      </div>
                    </div>

                    {/* Expandable Details Section */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-100 bg-white space-y-3 animate-in fade-in duration-150">
                        {/* Inclusions */}
                        {pkg.inclusions?.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              Inclusions ({pkg.inclusions.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                              {pkg.inclusions.map((inc, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60"
                                >
                                  {inc}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add-ons */}
                        {pkg.add_ons?.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                              Add-ons ({pkg.add_ons.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {pkg.add_ons.map((addon, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 font-medium"
                                >
                                  +{typeof addon === "string" ? addon : addon.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Review Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">{selectedIndices.size}</span> of{" "}
                <span className="font-bold text-slate-900">{extractedPackages.length}</span>{" "}
                packages ready to import
              </div>

              <div className="flex items-center gap-2">
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={handleClose}
                  disabled={isBulkImporting}
                  className="text-xs"
                >
                  Cancel
                </Btn>

                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={isBulkImporting || selectedIndices.size === 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isBulkImporting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  <span>
                    {isBulkImporting
                      ? "Saving Packages..."
                      : `Import ${selectedIndices.size} Package${selectedIndices.size > 1 ? "s" : ""}`}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
