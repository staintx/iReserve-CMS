import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Sparkles,
  UploadCloud,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  FileSpreadsheet,
  ArrowRight,
  Info,
} from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export default function AIPackageParserModal({ isOpen, onClose, onParsed }) {
  const [activeTab, setActiveTab] = useState("file"); // 'file' or 'text'
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const fileInputRef = useRef(null);
  const { notify } = useToast();

  const parsingSteps = [
    "Analyzing document structure & vision...",
    "Extracting package title, event type & capacities...",
    "Categorizing inclusions & dining equipment...",
    "Mapping scaffold dimensions & add-ons...",
  ];

  // Rotate loading step messages for engaging feedback
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
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

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

    if (selectedFile.size > 5 * 1024 * 1024) {
      notify("File exceeds 5MB limit. Please upload a smaller file.", "error");
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
    const sample = `Package Name: Grand Wedding Celebration Setup
Event Type: Wedding
Estimated Guests: 150 to 250 guests
Base Price: 35000

Inclusions:
- [Event Setup & Furniture] Elegant Stage Backdrop with Fairy Lights
- [Event Setup & Furniture] Couple Loveseat & Table
- [Event Setup & Furniture] 20x Round Tables with Floor-length Linen
- [Event Setup & Furniture] 150x Tiffany Chairs with Ribbons
- [Dining & Service Inventory] Food Warmers & Chafing Dishes (8 sets)
- [Dining & Service Inventory] Complete Porcelain Plates & Cutlery (200 sets)
- [Dining & Service Inventory] Water Station with Mineral Water & Cooler

Add-ons:
- Red Carpet Entrance (1)
- Photobooth with Unlimited Prints (1)
- Sound System & Basic Lighting (1)

Supported Sizes:
- 20x40 Setup (100 to 150 guests)
- 40x40 Setup (150 to 220 guests)
- 40x60 Setup (250 to 350 guests)`;
    setTextInput(sample);
  };

  const handleSubmit = async () => {
    if (activeTab === "file" && !file) {
      notify("Please select a file or screenshot to parse.", "error");
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

      const res = await AdminAPI.parsePackageWithAI(formData);
      notify("Package details extracted successfully!", "success");
      onParsed(res.data);
      onClose();

      // Clean up
      if (filePreview) URL.revokeObjectURL(filePreview);
      setFile(null);
      setFilePreview(null);
      setTextInput("");
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

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Ambient Glow */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/70 to-white">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2">
              <Sparkles size={12} className="text-indigo-600" />
              <span>AI Ingestion Engine</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Auto-Fill Package with AI
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Upload a package flyer, quotation PDF, or paste unstructured text to populate all fields automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

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
              <span>Upload Document / Image</span>
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

        {/* Main Content Area */}
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
                AI Assistant is Analyzing
              </h4>
              <p className="text-xs text-indigo-600 font-medium mt-1 min-h-[20px] transition-all duration-300">
                {parsingSteps[loadingStep]}
              </p>

              {/* Shimmering Progress Bar */}
              <div className="w-64 h-1.5 bg-slate-200 rounded-full mt-5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-full animate-progress" />
              </div>

              <span className="text-[11px] text-slate-400 mt-3">
                This typically takes 2-4 seconds
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
                    Event price lists, catalog screenshots, or quotation brochures
                  </p>

                  <div className="flex items-center gap-1.5 mt-4">
                    {["PDF", "PNG", "JPG", "WEBP"].map((badge) => (
                      <span
                        key={badge}
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200/70"
                      >
                        {badge}
                      </span>
                    ))}
                    <span className="text-[11px] text-slate-400 ml-1">Up to 5MB</span>
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
                        {file.type === "application/pdf" ? "PDF Document" : "Image File"}
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
                    Load Sample
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
                placeholder={`Example:\nPackage: Birthday Celebration\nGuests: 50-80 pax\nInclusions: Balloon backdrop, Monoblock chairs (50), Plates (50)\nSizes: 20x20, 20x40`}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Supports unformatted text, chat copies, or bullet lists</span>
                <span>{textInput.length} chars</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info size={13} className="text-slate-400" />
            <span>Parsed values can be fine-tuned before saving</span>
          </div>

          <div className="flex items-center gap-2">
            <Btn
              variant="secondary"
              size="sm"
              onClick={onClose}
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
              <span>{loading ? "Extracting Data..." : "Extract & Auto-Fill"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
