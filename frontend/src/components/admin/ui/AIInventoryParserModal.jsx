import React, { useState, useRef, useEffect } from "react";
import {
  X,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  FileText,
  Trash2,
  CheckSquare,
  Square,
  RotateCcw,
  Boxes,
  Info,
  File as FileIcon,
  AlertTriangle,
} from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";


const normalizeIdentifier = (name) => {
  if (!name || typeof name !== "string") return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export default function AIInventoryParserModal({
  isOpen,
  onClose,
  onBulkSuccess,
  existingItems = [],
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
    "Uploading document...",
    "Zelle AI is scanning your equipment & service inventory...",
    "Extracting stock quantities...",
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
    setTextInput(`EVENT INVENTORY & LOGISTICS SUMMARY

Event Setup & Furniture:
- Stage Setup
- Buffet Setup
- Balloon and Name Backdrop
- Couch
- Grass Carpet
- Cake Table
- Giveaway Rack
- Round Tables (12)
- Monoblock Chairs (100)
- Tiffany Chairs (20)
- Industrial Fan
- Water Station
- Red Carpet
- Dove
- Chandelier (2)

Dining & Service Inventory:
- Food Warmer (7)
- Serving Spoons
- Plates (200)
- Plastic Plates for Pahapunan (100)
- Additional Charger Plates (VIP)
- Glasses (6 trays)
- Highball Glass and Goblets
- Cutlery Sets (200)
- Tissues
- Planggana (6)
- Tulyasi (2)
- Tungko (2)
- Dishwashing Liquid
- Styrofoam Containers (6)
- Ice Cooler (2)
- Ice Cubes
- Mineral Water Gallon (6)
- Water Jug (2)`);
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

    try {
      const formData = new FormData();
      if (activeTab === "file" && file) {
        formData.append("file", file);
      } else {
        formData.append("text", textInput);
      }

      const res = await AdminAPI.parseInventoryWithAI(formData);
      const items = res.data?.inventory || [];

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("No inventory items could be recognized in the document.");
      }

      setExtractedItems(items);
      setSelectedIndices(new Set(items.map((_, i) => i)));
      setStep("review");
      notify(`AI successfully recognized ${items.length} inventory items!`, "success");
    } catch (err) {
      console.error("AI inventory parse error:", err);
      let errorMsg =
        err.response?.data?.details ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to parse inventory items with AI";

      if (err.code === "ECONNABORTED" || err.message?.toLowerCase().includes("timeout")) {
        errorMsg = "The AI reading took longer than expected. Please try uploading again or use a smaller document.";
      }

      notify(errorMsg, "error");
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

  // Helper to check if an item already exists in existingItems
  const isDuplicate = (itemName) => {
    if (!itemName) return false;
    const targetIdent = normalizeIdentifier(itemName);
    const targetLower = itemName.trim().toLowerCase();
    return existingItems.some((inv) => {
      const invIdent = inv.identifier || normalizeIdentifier(inv.item_name);
      const invLower = (inv.item_name || "").trim().toLowerCase();
      return (targetIdent && invIdent && targetIdent === invIdent) || (invLower && invLower === targetLower);
    });
  };

  const handleBulkImport = async () => {
    const toImport = extractedItems.filter((_, i) => selectedIndices.has(i));
    if (toImport.length === 0) {
      notify("Please select at least 1 item to import", "error");
      return;
    }

    setIsBulkImporting(true);
    try {
      const res = await AdminAPI.createBulkInventory(toImport);
      const totalImported = res.data?.totalImported ?? toImport.length;
      const totalSkipped = res.data?.totalSkipped ?? 0;

      if (totalSkipped > 0) {
        notify(
          `Imported ${totalImported} items! (${totalSkipped} duplicate items already in inventory were skipped)`,
          "info"
        );
      } else {
        notify(
          res.data?.message || `Successfully imported ${totalImported} items into Inventory!`,
          "success"
        );
      }

      if (onBulkSuccess) onBulkSuccess();
      handleClose();
    } catch (err) {
      console.error("Bulk inventory import error:", err);
      notify(
        err.response?.data?.details ||
          err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to bulk import inventory items",
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
          step === "review" ? "max-w-4xl max-h-[92vh]" : "max-w-xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Glow */}
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
                ? `Review Inventory Items Found by Zelle (${extractedItems.length})`
                : "Import Inventory with Zelle AI"}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-lg">
              {step === "review"
                ? "Verify item names and quantities before importing them to your live inventory."
                : "Upload a PDF brochure, equipment sheet, invoice, or paste text. Zelle AI will extract items and counts automatically."}
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

        {/* Step 1: Upload */}
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
                /* Scanner Animation */
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl bg-gradient-to-b from-indigo-50/40 via-violet-50/20 to-white border border-indigo-100/80 text-center">
                  <div className="relative mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white animate-pulse">
                      <Sparkles size={28} className="animate-spin-slow" />
                    </div>
                    <div className="absolute -inset-2 rounded-3xl bg-indigo-500/15 blur-md -z-10 animate-pulse" />
                  </div>

                  <h4 className="text-base font-bold text-slate-800">
                    Zelle AI is Reading Your Inventory Document
                  </h4>
                  <p className="text-xs text-indigo-600 font-medium mt-1 min-h-[20px] transition-all duration-300">
                    {parsingSteps[loadingStep]}
                  </p>

                  <div className="w-64 h-1.5 bg-slate-200 rounded-full mt-5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-full animate-progress" />
                  </div>

                  <span className="text-[11px] text-slate-400 mt-3">
                    Extracting furniture, equipment, tableware, and counts...
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
                        Package brochures, equipment count sheets, or invoices
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
                            {file.type === "application/pdf"
                              ? "PDF Document (Multi-page supported)"
                              : "Image File"}
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
                      Raw Inventory Text / Logistics Notes
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleLoadSampleText}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        Load Sample Inventory
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
                    placeholder={`Example:\nEvent Setup & Furniture:\n- Round Tables (12)\n- Monoblock Chairs (100)\n\nDining & Service Inventory:\n- Food Warmer (7)\n- Plates (200)`}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>Supports multi-tier package overviews, equipment lists, or invoices</span>
                    <span>{textInput.length} chars</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Info size={13} className="text-slate-400" />
                <span>All extracted items can be reviewed and edited before saving</span>
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

        {/* Step 2: Review & Batch Import */}
        {step === "review" && (
          <>
            {/* Toolbar for Selection */}
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
                <span>Re-upload Document</span>
              </button>
            </div>

            {/* Scrollable Items List */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3">
              {extractedItems.map((item, idx) => {
                const isSelected = selectedIndices.has(idx);
                const duplicate = isDuplicate(item.item_name);

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
                              value={item.item_name}
                              onChange={(e) =>
                                handleUpdateItem(idx, "item_name", e.target.value)
                              }
                              className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 px-1 py-0.5 rounded outline-none transition-all flex-1 min-w-[200px]"
                              placeholder="Item Name (e.g. Plates, Food Warmer)"
                            />


                            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                              <span className="text-[11px] font-semibold text-slate-500">Qty:</span>
                              <input
                                type="number"
                                min="0"
                                value={item.quantity !== undefined ? item.quantity : 1}
                                onChange={(e) =>
                                  handleUpdateItem(idx, "quantity", Math.max(0, parseInt(e.target.value, 10) || 0))
                                }
                                className="w-16 text-xs font-bold text-slate-900 bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500 text-center tabular-nums"
                              />
                            </div>
                          </div>

                          {duplicate && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/80">
                              <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                              <span>Already exists in inventory (will be skipped during bulk import)</span>
                            </div>
                          )}
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
                items selected for import
              </div>

              <div className="flex items-center gap-2">
                <Btn
                  variant="secondary"
                  size="sm"
                  onClick={() => setStep("upload")}
                  disabled={isBulkImporting}
                  className="text-xs"
                >
                  Back
                </Btn>

                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={isBulkImporting || selectedIndices.size === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Boxes size={14} className={isBulkImporting ? "animate-spin" : ""} />
                  <span>
                    {isBulkImporting
                      ? "Importing Items..."
                      : `Import ${selectedIndices.size} Selected Items`}
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
