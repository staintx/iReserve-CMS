import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../ui/alert-dialog";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import PolicyRenderer from "../../policy/PolicyRenderer";
import { DEFAULT_POLICIES } from "../../policy/defaultPolicies";
import {
  markdownToHtml,
  formatPolicyDate,
} from "../../policy/policyFormat";
import {
  Heading,
  Type,
  Bold,
  List,
  ListOrdered,
  AlertCircle,
  RotateCcw,
  Undo2,
  Redo2,
  Eye,
  Edit3,
  Loader2,
  CheckCircle2,
  Send,
  Save,
  ShieldCheck,
  Info,
  X,
} from "lucide-react";

export default function PolicyEditorModal({
  open,
  onClose,
  policyKey,
  policyData,
  onSave,
  saving = false,
}) {
  const defaultTemplate = DEFAULT_POLICIES[policyKey] || {};
  const policyTitle = policyData?.title || defaultTemplate.title || "Policy";

  // Resolve initial HTML content prioritizing draft_content, then content, then default template
  const getInitialContent = useCallback(() => {
    const draft = policyData?.draft_content;
    if (typeof draft === "string" && draft.trim().length > 0) {
      return markdownToHtml(draft);
    }
    const published = policyData?.content;
    if (typeof published === "string" && published.trim().length > 0) {
      return markdownToHtml(published);
    }
    return markdownToHtml(defaultTemplate.content || "");
  }, [policyData?.draft_content, policyData?.content, defaultTemplate.content]);

  const initialHtml = getInitialContent();

  const [content, setContent] = useState(initialHtml);
  const [activeTab, setActiveTab] = useState("edit"); // "edit" | "preview"
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    isBold: false,
    isHeading: false,
    isBulletList: false,
    isNumberedList: false,
    isCallout: false,
  });

  // Dialog states
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // References
  const editorRef = useRef(null);
  const initialContentRef = useRef(initialHtml);
  // Tracks latest editor HTML without causing re-renders (avoids the cursor-reset loop)
  const contentRef = useRef(initialHtml);
  const historyRef = useRef([initialHtml]);
  const historyIndexRef = useRef(0);
  const debounceTimerRef = useRef(null);

  // Determine publication & draft statuses
  const hasDraft =
    typeof policyData?.draft_content === "string" &&
    policyData.draft_content.trim().length > 0;
  const isPublished = policyData?.status === "published" && !hasDraft;
  const publishedDate = formatPolicyDate(policyData?.published_at);
  const updatedDate = formatPolicyDate(policyData?.updated_at);
  const isDirty = content.trim() !== initialContentRef.current.trim();

  // Ref callback to guarantee the DOM element is immediately populated upon mounting.
  // Only depends on initialHtml — NOT on `content` state, which would remount on every keystroke.
  const setEditorRef = useCallback(
    (node) => {
      editorRef.current = node;
      if (node) {
        const isBlank =
          !node.innerHTML ||
          node.innerHTML === "<br>" ||
          node.innerHTML === "<p></p>" ||
          node.innerHTML === "<p><br></p>";
        if (isBlank) {
          node.innerHTML = initialHtml;
          contentRef.current = initialHtml;
        }
      }
    },
    [initialHtml] // ← removed "content" — was causing remount on every keystroke
  );

  // Initialize/Sync editor on open or when policyKey/policyData changes
  useEffect(() => {
    if (open) {
      const formatted = getInitialContent();
      setContent(formatted);
      contentRef.current = formatted;
      initialContentRef.current = formatted;
      historyRef.current = [formatted];
      historyIndexRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);
      setActiveTab("edit");

      if (editorRef.current) {
        editorRef.current.innerHTML = formatted;
      }
    }
  }, [open, policyKey, policyData, getInitialContent]);

  // Sync editor innerHTML ONLY when switching back to "edit" tab (e.g. returning from preview).
  // Must NOT depend on `content` state — that would reset the DOM and lose the cursor on every keystroke.
  useEffect(() => {
    if (activeTab === "edit" && editorRef.current) {
      const latest = contentRef.current;
      if (editorRef.current.innerHTML !== latest) {
        editorRef.current.innerHTML = latest;
      }
    }
  }, [activeTab]); // ← intentionally omits content; contentRef holds the live value

  // Push new snapshot to history stack
  const pushHistory = useCallback((newHtml) => {
    if (newHtml === historyRef.current[historyIndexRef.current]) return;
    const nextIndex = historyIndexRef.current + 1;
    const nextHistory = historyRef.current.slice(0, nextIndex);
    nextHistory.push(newHtml);
    if (nextHistory.length > 60) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
    setContent(newHtml);
  }, []);

  // Update active format states based on current selection
  const updateActiveStates = useCallback(() => {
    if (!editorRef.current) return;
    try {
      const isBold = document.queryCommandState("bold");
      const selection = window.getSelection();
      let isHeading = false;
      let isBulletList = false;
      let isNumberedList = false;
      let isCallout = false;

      if (selection && selection.rangeCount > 0) {
        let node = selection.anchorNode;
        if (node && node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode;
        }

        while (node && node !== editorRef.current && node !== document.body) {
          const tag = node.tagName?.toLowerCase();
          if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
            isHeading = true;
          }
          if (tag === "ul") isBulletList = true;
          if (tag === "ol") isNumberedList = true;
          if (tag === "blockquote") isCallout = true;
          node = node.parentNode;
        }
      }

      setActiveFormats({
        isBold,
        isHeading,
        isBulletList,
        isNumberedList,
        isCallout,
      });
    } catch {
      // ignore selection query errors
    }
  }, []);

  // Handle live input in contentEditable
  const handleInput = () => {
    if (!editorRef.current) return;
    const newHtml = editorRef.current.innerHTML;

    // Update contentRef immediately (no re-render, no cursor reset)
    contentRef.current = newHtml;
    // Update React state only for dirty-tracking (isDirty, word count)
    setContent(newHtml);
    updateActiveStates();

    // Debounce history snapshot on typing
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      pushHistory(newHtml);
    }, 450);
  };

  // Undo action
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      const nextIndex = historyIndexRef.current - 1;
      historyIndexRef.current = nextIndex;
      const targetHtml = historyRef.current[nextIndex];
      contentRef.current = targetHtml;
      if (editorRef.current) {
        editorRef.current.innerHTML = targetHtml;
      }
      setContent(targetHtml);
      setCanUndo(nextIndex > 0);
      setCanRedo(true);
      setTimeout(updateActiveStates, 10);
    }
  }, [updateActiveStates]);

  // Redo action
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      const nextIndex = historyIndexRef.current + 1;
      historyIndexRef.current = nextIndex;
      const targetHtml = historyRef.current[nextIndex];
      contentRef.current = targetHtml;
      if (editorRef.current) {
        editorRef.current.innerHTML = targetHtml;
      }
      setContent(targetHtml);
      setCanUndo(true);
      setCanRedo(nextIndex < historyRef.current.length - 1);
      setTimeout(updateActiveStates, 10);
    }
  }, [updateActiveStates]);

  // Execute formatting command with immediate history snapshot
  const executeCommand = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    if (command === "heading") {
      if (activeFormats.isHeading) {
        document.execCommand("formatBlock", false, "<p>");
      } else {
        document.execCommand("formatBlock", false, "<h3>");
      }
    } else if (command === "paragraph") {
      document.execCommand("formatBlock", false, "<p>");
    } else if (command === "callout") {
      if (activeFormats.isCallout) {
        document.execCommand("formatBlock", false, "<p>");
      } else {
        document.execCommand("formatBlock", false, "<blockquote>");
      }
    } else {
      document.execCommand(command, false, value);
    }

    const currentHtml = editorRef.current.innerHTML;
    contentRef.current = currentHtml;
    pushHistory(currentHtml);
    setTimeout(updateActiveStates, 10);
  };

  // Keyboard shortcut listener
  const handleKeyDown = (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier) {
      const key = e.key.toLowerCase();

      // Undo: Ctrl+Z / Cmd+Z (without shift)
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Bold: Ctrl+B / Cmd+B
      if (key === "b") {
        e.preventDefault();
        executeCommand("bold");
        return;
      }
    }
  };

  // Safe Close with Unsaved Changes check
  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  };

  // Restore Template Confirm Handler
  const handleConfirmRestoreTemplate = () => {
    const defaultHtml = markdownToHtml(defaultTemplate.content || "");
    if (editorRef.current) {
      editorRef.current.innerHTML = defaultHtml;
    }
    contentRef.current = defaultHtml;
    pushHistory(defaultHtml);
    setShowRestoreDialog(false);
  };

  // Save Draft Action (captures latest editor HTML)
  const handleSaveDraft = () => {
    const currentHtml = editorRef.current
      ? editorRef.current.innerHTML
      : content;
    onSave(policyKey, {
      content: policyData?.content || defaultTemplate.content,
      draft_content: currentHtml,
      action: "save",
    });
  };

  // Publish Action (captures latest editor HTML)
  const handlePublish = () => {
    const currentHtml = editorRef.current
      ? editorRef.current.innerHTML
      : content;
    onSave(policyKey, {
      content: currentHtml,
      draft_content: "",
      action: "publish",
    });
  };

  // Calculate word count from editor plain text
  const plainText = editorRef.current?.innerText || "";
  const wordCount = plainText.trim()
    ? plainText.trim().split(/\s+/).length
    : 0;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (!val) handleRequestClose();
        }}
      >
        <DialogContent
          hideClose={true}
          className="sm:max-w-4xl max-h-[94vh] flex flex-col p-0 overflow-hidden border border-slate-200 shadow-2xl bg-white font-sans text-slate-800"
        >
          {/* Header */}
          <DialogHeader className="p-5 pb-3.5 border-b border-slate-100 bg-slate-50/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <DialogTitle className="font-sans text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Edit {policyTitle}
                  </DialogTitle>
                  {isPublished ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold py-0.5 px-2 gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Live Published
                    </Badge>
                  ) : hasDraft ? (
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-semibold py-0.5 px-2 gap-1"
                    >
                      <Edit3 className="w-3 h-3" /> Draft Changes Pending
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-slate-100 text-slate-700 border-slate-200 text-[11px] font-semibold py-0.5 px-2"
                    >
                      Draft
                    </Badge>
                  )}
                </div>

                <DialogDescription className="font-sans text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                  <span>
                    {publishedDate ? (
                      <>Currently Live: Published on <strong>{publishedDate}</strong></>
                    ) : (
                      "Not yet published to customers"
                    )}
                  </span>
                  {updatedDate && hasDraft && (
                    <span className="text-slate-400">
                      • Draft saved on {updatedDate}
                    </span>
                  )}
                </DialogDescription>
              </div>

              {/* Controls: Mode Switcher & Clean Close X Button */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <div className="flex items-center p-1 rounded-lg bg-slate-200/80 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      activeTab === "edit"
                        ? "bg-white text-[#1E3563] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editorRef.current) {
                        setContent(editorRef.current.innerHTML);
                      }
                      setActiveTab("preview");
                    }}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                      activeTab === "preview"
                        ? "bg-white text-[#1E3563] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Live Preview
                  </button>
                </div>

                {/* Redesigned Close Button: Slate/Blue, zero warm colors */}
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                  title="Close dialog"
                >
                  <X className="w-4 h-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
            </div>

            {/* Established Alert / Notification Pattern: Clean Blue / Slate */}
            <div className="mt-3 p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-[#1E3563] flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-4 h-4 text-[#1E3563]" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    Policy Management &amp; Customer Propagation
                  </p>
                  <p className="text-[11.5px] text-slate-600 leading-relaxed mt-0.5">
                    Draft changes stay private for review. Once published, your policy updates immediately across all customer booking wizards, quotations, invoices, and footer links.
                  </p>
                </div>
              </div>
              {isDirty && (
                <Badge
                  variant="outline"
                  className="bg-blue-100/80 text-[#1E3563] border-blue-300 text-[10.5px] font-semibold py-0.5 px-2.5 shrink-0 self-center"
                >
                  Unsaved edits in editor
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Body: WYSIWYG Editor OR Customer Live Preview */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 font-sans">
            {activeTab === "edit" ? (
              <div className="space-y-2.5">
                {/* WYSIWYG Formatting Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex flex-wrap items-center gap-1">
                    {/* Undo */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleUndo}
                      disabled={!canUndo}
                      title="Undo (Ctrl+Z)"
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-[#1E3563] hover:bg-slate-200/70 disabled:opacity-40 disabled:pointer-events-none p-1.5 rounded transition-colors cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Redo */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleRedo}
                      disabled={!canRedo}
                      title="Redo (Ctrl+Y)"
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-[#1E3563] hover:bg-slate-200/70 disabled:opacity-40 disabled:pointer-events-none p-1.5 rounded transition-colors cursor-pointer"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-4 w-px bg-slate-300 mx-1" />

                    {/* Section Heading */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => executeCommand("heading")}
                      title="Section Heading"
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
                        activeFormats.isHeading
                          ? "bg-[#1E3563] text-white font-bold"
                          : "font-semibold text-slate-700 hover:text-[#1E3563] hover:bg-slate-200/70"
                      }`}
                    >
                      <Heading className="w-3.5 h-3.5" />
                      Heading
                    </button>

                    {/* Normal text */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => executeCommand("paragraph")}
                      title="Normal Paragraph"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-[#1E3563] hover:bg-slate-200/70 px-2 py-1 rounded transition-colors cursor-pointer"
                    >
                      <Type className="w-3.5 h-3.5" />
                      Normal
                    </button>

                    {/* Bold */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => executeCommand("bold")}
                      title="Bold (Ctrl+B)"
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
                        activeFormats.isBold
                          ? "bg-[#1E3563] text-white font-bold"
                          : "font-semibold text-slate-700 hover:text-[#1E3563] hover:bg-slate-200/70"
                      }`}
                    >
                      <Bold className="w-3.5 h-3.5" />
                      Bold
                    </button>

                    <div className="h-4 w-px bg-slate-300 mx-1" />

                    {/* Bullet List */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => executeCommand("insertUnorderedList")}
                      title="Bullet List"
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
                        activeFormats.isBulletList
                          ? "bg-[#1E3563] text-white font-bold"
                          : "font-semibold text-slate-700 hover:text-[#1E3563] hover:bg-slate-200/70"
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      Bullets
                    </button>

                    {/* Numbered List */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => executeCommand("insertOrderedList")}
                      title="Numbered List"
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
                        activeFormats.isNumberedList
                          ? "bg-[#1E3563] text-white font-bold"
                          : "font-semibold text-slate-700 hover:text-[#1E3563] hover:bg-slate-200/70"
                      }`}
                    >
                      <ListOrdered className="w-3.5 h-3.5" />
                      Numbered
                    </button>

                    {/* Callout Box */}
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => executeCommand("callout")}
                      title="Highlighted Callout Note"
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors cursor-pointer ${
                        activeFormats.isCallout
                          ? "bg-[#1E3563] text-white font-bold"
                          : "font-semibold text-slate-700 hover:text-[#1E3563] hover:bg-slate-200/70"
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                      Callout Note
                    </button>
                  </div>

                  {/* Restore Template (requires confirmation) */}
                  <button
                    type="button"
                    onClick={() => setShowRestoreDialog(true)}
                    title="Restore recommended standard template"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 px-2 py-1 rounded transition-colors cursor-pointer ml-auto border border-slate-200/80"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-500" />
                    Restore Template
                  </button>
                </div>

                {/* Proper WYSIWYG ContentEditable editor */}
                <div className="relative">
                  <div
                    ref={setEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onKeyUp={updateActiveStates}
                    onMouseUp={updateActiveStates}
                    data-placeholder="Click here to type your policy guidelines..."
                    className="policy-editor-sheet w-full min-h-[360px] max-h-[500px] overflow-y-auto rounded-xl border border-slate-200 p-5 sm:p-6 bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3563]/20 focus:border-[#1E3563] shadow-xs cursor-text font-sans"
                  />
                </div>

                {/* Clean Right-Aligned Word Count */}
                <div className="flex items-center justify-end text-[11px] text-slate-400 px-1 font-medium">
                  <span>{wordCount} words</span>
                </div>
              </div>
            ) : (
              /* Live Customer Preview Tab */
              <div className="space-y-3 font-sans">
                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-100/70 text-[#1E3563] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-[#1E3563]" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900">Customer Portal Simulation: </span>
                      <span className="text-[11.5px] text-slate-600">This matches how your customers read this policy in the booking wizard, quotations, and customer footer.</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white text-[#1E3563] border-blue-200 text-[10px] font-bold shrink-0">
                    Live Preview
                  </Badge>
                </div>

                <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs max-h-[480px] overflow-y-auto">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h2 className="font-sans text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                      {policyTitle}
                    </h2>
                    <p className="font-sans text-[11px] text-slate-400 mt-0.5">
                      Customer portal simulation
                    </p>
                  </div>

                  <PolicyRenderer content={content} />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-sans">
            <p className="text-[11px] text-slate-500 m-0 font-sans">
              Publishing instantly updates the policy on all customer booking flows, invoices, and footer.
            </p>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRequestClose}
                disabled={saving}
                className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer font-sans"
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={saving}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer gap-1.5 font-sans"
                title="Saves a private draft without affecting customer screens"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-slate-600" />
                )}
                Save Draft
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handlePublish}
                disabled={saving}
                className="text-xs font-semibold bg-[#1E3563] hover:bg-[#162749] text-white cursor-pointer px-4 gap-1.5 shadow-xs font-sans"
                title="Pushes this policy live to all customer areas"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Publish Policy
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog: Discard Unsaved Changes */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="border border-slate-200 bg-white font-sans text-slate-800">
          <AlertDialogHeader className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-slate-700" />
              </div>
              <AlertDialogTitle className="font-sans text-base font-bold text-slate-900">
                Discard Unsaved Changes?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-sans text-xs text-slate-600 leading-relaxed pl-12">
              You have unsaved changes to this policy. If you exit now, any edits you made will not be saved. You can save a draft to keep your progress without publishing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-2 pt-2">
            <AlertDialogCancel className="font-sans text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnsavedDialog(false);
                onClose();
              }}
              className="font-sans text-xs bg-slate-800 hover:bg-slate-900 text-white cursor-pointer"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog: Restore Standard Template */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent className="border border-slate-200 bg-white font-sans text-slate-800">
          <AlertDialogHeader className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E3563] flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 text-[#1E3563]" />
              </div>
              <AlertDialogTitle className="font-sans text-base font-bold text-slate-900">
                Restore Recommended Standard Template?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-sans text-xs text-slate-600 leading-relaxed pl-12">
              This will replace your current editor content with the recommended standard template for <strong>{policyTitle}</strong>. Any custom wording you entered will be replaced. You can undo this action with Ctrl+Z if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center gap-2 pt-2">
            <AlertDialogCancel className="font-sans text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              Keep Current Text
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestoreTemplate}
              className="font-sans text-xs bg-[#1E3563] hover:bg-[#162749] text-white cursor-pointer"
            >
              Restore Standard Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
