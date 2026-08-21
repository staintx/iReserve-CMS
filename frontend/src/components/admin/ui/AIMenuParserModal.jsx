import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  Sparkles,
  Check,
  CheckCircle2,
  FileText,
  Trash2,
  CheckSquare,
  Square,
  RotateCcw,
  UtensilsCrossed,
  Info,
  File as FileIcon,
  Loader2,
} from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

const MENU_CATEGORIES = [
  "Appetizer",
  "Soup",
  "Salad",
  "Main Course",
  "Vegetable",
  "Pasta",
  "Rice",
  "Dessert",
  "Beverage",
  "Drinking Water",
];

export default function AIMenuParserModal({
  isOpen,
  onClose,
  onBulkSuccess,
}) {
  const { notify } = useToast();
  const fileInputRef = useRef(null);

  // Steps: 'upload' | 'review'
  const [step, setStep] = useState("upload");
  const [activeTab, setActiveTab] = useState("file"); // 'file' | 'text'
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Review stage state
  const [extractedItems, setExtractedItems] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  const parsingSteps = [
    "Uploading menu document...",
    "Zelle AI is reading dishes and categories...",
    "Organizing descriptions and food courses...",
    "Almost ready for your review...",
  ];

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    if (!validTypes.includes(selectedFile.type)) {
      notify("Please upload a valid image (JPG, PNG, WEBP) or PDF file", "error");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      notify("File size must be less than 10MB", "error");
      return;
    }

    setFile(selectedFile);
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (loading || isBulkImporting) return;
    setFile(null);
    setFilePreview(null);
    setTextInput("");
    setExtractedItems([]);
    setSelectedIndices(new Set());
    setStep("upload");
    onClose();
  };

  const handleLoadSampleText = () => {
    setTextInput(`CATERING BUFFET MENU CHOICES

MAIN COURSES:
- Beef Salpicao with toasted garlic bits in savory butter sauce
- Slow-Roasted Pork Belly with spiced liver gravy and cracklings
- Classic Chicken Teriyaki topped with toasted sesame seeds
- Crispy Fish Fillet with creamy herb tartar sauce

PASTA & NOODLES:
- Creamy Carbonara with smoked bacon crisp and parmesan
- Sotanghon Guisado with shredded chicken and fresh vegetables

VEGETABLES:
- Buttered Medley Vegetables with sweet corn, carrots, and peas
- Chopsuey Guisado with quail eggs and crisp cabbage

RICE:
- Steamed Fragrant Jasmine Rice
- Yang Chow Fried Rice with diced ham and green peas

DESSERT:
- Creamy Buko Pandan with shredded young coconut and nata de coco
- Traditional Leche Flan with rich golden caramel syrup

BEVERAGE:
- Signature House Red Iced Tea (Bottomless)
- Purified Drinking Water`);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (activeTab === "file" && !file) {
      notify("Please select a file to parse", "error");
      return;
    }
    if (activeTab === "text" && !textInput.trim()) {
      notify("Please enter or paste text to parse", "error");
      return;
    }

    setLoading(true);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < parsingSteps.length - 1 ? prev + 1 : prev));
    }, 1800);

    try {
      const formData = new FormData();
      if (activeTab === "file" && file) {
        formData.append("file", file);
      } else {
        formData.append("text", textInput);
      }

      const res = await AdminAPI.parseMenuWithAI(formData);
      clearInterval(stepInterval);

      const items = res.data?.items || [];
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("No dishes or menu items could be recognized in the document.");
      }

      setExtractedItems(items);
      setSelectedIndices(new Set(items.map((_, i) => i)));
      setStep("review");
      notify(`AI successfully identified ${items.length} menu items!`, "success");
    } catch (err) {
      clearInterval(stepInterval);
      console.error("AI menu parse error:", err);
      notify(
        err.response?.data?.details ||
          err.response?.data?.error ||
          err.message ||
          "Failed to parse menu items with AI",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (index) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIndices.size === extractedItems.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(extractedItems.map((_, i) => i)));
    }
  };

  const handleRemoveItem = (index) => {
    const next = extractedItems.filter((_, i) => i !== index);
    setExtractedItems(next);
    setSelectedIndices((prev) => {
      const updated = new Set();
      next.forEach((_, newIdx) => {
        if (newIdx < index && prev.has(newIdx)) updated.add(newIdx);
        if (newIdx >= index && prev.has(newIdx + 1)) updated.add(newIdx);
      });
      return updated;
    });
  };

  const handleUpdateItem = (index, field, value) => {
    setExtractedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleBulkImport = async () => {
    const toImport = extractedItems.filter((_, i) => selectedIndices.has(i));
    if (toImport.length === 0) {
      notify("Please select at least 1 menu item to import", "error");
      return;
    }

    setIsBulkImporting(true);
    try {
      const res = await AdminAPI.createBulkMenu(toImport);
      notify(
        res.data?.message || `Successfully created ${toImport.length} menu items!`,
        "success"
      );
      if (onBulkSuccess) onBulkSuccess();
      handleClose();
    } catch (err) {
      console.error("Bulk menu import error:", err);
      notify(
        err.response?.data?.details ||
          err.response?.data?.error ||
          "Failed to import menu items",
        "error"
      );
    } finally {
      setIsBulkImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden animate-in zoom-in-95 duration-200 ${
          step === "review" ? "max-w-3xl max-h-[90vh]" : "max-w-xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Glow */}
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
                ? `Review Menu Items Found by Zelle (${extractedItems.length})`
                : "Import Menu Items with Zelle AI"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-lg">
              {step === "review"
                ? "Check the dishes below before saving them to your food menu."
                : "Upload a catering menu flyer, photo, or paste text. Zelle AI will read the dishes and organize them for you."}
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
            {/* Tab Switcher */}
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
                  <span>Upload Menu PDF / Image</span>
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
                  <span>Paste Raw Menu</span>
                </button>
              </div>
            </div>

            {/* Main Upload Body */}
            <div className="p-6 pt-2">
              {loading ? (
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
                    Finding all food and beverage dishes...
                  </span>
                </div>
              ) : activeTab === "file" ? (
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
                        PDF catering menus, course lists, or banquet flyers
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
                        <span className="text-[11px] text-slate-400 ml-1">Up to 10MB</span>
                      </div>
                    </div>
                  ) : (
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
                          <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-indigo-200 flex items-center justify-center text-indigo-500 shrink-0">
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
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Raw Menu Notes / Course List
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleLoadSampleText}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        Load Sample Buffet Menu
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
                    placeholder={`Example:\nMain Courses:\n- Beef Salpicao\n- Slow Roasted Pork Belly\nPasta:\n- Creamy Carbonara\nDessert:\n- Buko Pandan`}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>Supports catering menus, course lists, or banquet transcripts</span>
                    <span>{textInput.length} chars</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Info size={13} className="text-slate-400" />
                <span>All extracted dishes can be reviewed before saving</span>
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
            {/* Toolbar */}
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {selectedIndices.size === extractedItems.length ? (
                  <CheckSquare size={16} className="text-indigo-600" />
                ) : (
                  <Square size={16} className="text-slate-400" />
                )}
                <span>
                  Select All ({selectedIndices.size}/{extractedItems.length} selected)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStep("upload")}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Re-upload Menu</span>
              </button>
            </div>

            {/* List of Dishes */}
            <div className="p-6 overflow-y-auto max-h-[58vh] space-y-3">
              {extractedItems.map((item, idx) => {
                const isSelected = selectedIndices.has(idx);

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border transition-all duration-200 p-4 ${
                      isSelected
                        ? "border-indigo-300 bg-white shadow-sm ring-1 ring-indigo-200"
                        : "border-slate-200 bg-slate-50/60 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(idx)}
                          className="mt-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-indigo-600" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>

                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) =>
                                handleUpdateItem(idx, "name", e.target.value)
                              }
                              className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 px-1 py-0.5 rounded outline-none transition-all flex-1 min-w-[180px]"
                              placeholder="Dish Name"
                            />

                            <select
                              value={item.category}
                              onChange={(e) =>
                                handleUpdateItem(idx, "category", e.target.value)
                              }
                              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 outline-none cursor-pointer hover:bg-white focus:border-indigo-500 transition-colors"
                            >
                              {MENU_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleUpdateItem(idx, "description", e.target.value)
                            }
                            placeholder="Dish description / flavor notes..."
                            className="w-full text-xs text-slate-600 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/60 rounded-lg px-2.5 py-1.5 focus:bg-white focus:border-indigo-500 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 mt-0.5"
                        title="Remove from batch"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Review Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">{selectedIndices.size}</span> of{" "}
                <span className="font-bold text-slate-900">{extractedItems.length}</span>{" "}
                dishes ready to import
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
                      ? "Saving Dishes..."
                      : `Import ${selectedIndices.size} Dish${
                          selectedIndices.size > 1 ? "es" : ""
                        }`}
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
