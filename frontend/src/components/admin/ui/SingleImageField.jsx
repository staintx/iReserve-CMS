import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2, Undo2, X } from "lucide-react";
import { IMAGE_ACCEPT_ATTR, IMAGE_HINT, formatBytes, prepareImageFile } from "../../../lib/imageFiles";

/**
 * One image, one field.
 *
 * Empty, it is a compact full-width drop bar — an empty box the size of the
 * finished image only wastes vertical space and leaves dead width beside it.
 * Filled, it becomes a media row: a preview cropped to the ratio the image is
 * actually rendered at publicly, with the actions and caption alongside.
 *
 * Nothing is uploaded here — the picked File is handed back to the parent form
 * and travels with its normal submit.
 *
 * Props:
 *  - existingUrl    URL already persisted on the record (optional)
 *  - file           currently picked File, owned by the parent (optional)
 *  - onFileChange   (File | null) => void
 *  - aspect         CSS aspect-ratio for the preview, e.g. "16 / 9"
 *  - previewWidth   width of the preview in the filled row
 */
export default function SingleImageField({
  label,
  hint,
  existingUrl,
  file,
  onFileChange,
  aspect = "16 / 9",
  previewWidth = "12rem",
  emptyLabel = "Add an image",
  disabled = false,
  error,
}) {
  const inputRef = useRef(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const shownUrl = preview || existingUrl || "";
  const isNew = Boolean(file);
  const message = error || localError;

  const pick = async (picked) => {
    if (!picked) return;
    setLocalError("");
    setBusy(true);
    const { file: prepared, error: err } = await prepareImageFile(picked);
    setBusy(false);
    if (err) {
      setLocalError(err);
      return;
    }
    onFileChange(prepared);
  };

  const handleInput = (event) => {
    pick(event.target.files?.[0]);
    // Allow re-picking the same file after a discard.
    event.target.value = "";
  };

  const dragProps = {
    onDragOver: (e) => {
      e.preventDefault();
      setDragging(true);
    },
    onDragLeave: (e) => {
      // dragleave also fires when the pointer moves onto a child, which would
      // flicker the highlight off and on.
      if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      pick(e.dataTransfer.files?.[0]);
    },
  };

  const openPicker = () => inputRef.current?.click();

  const actionBase =
    "inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50";
  const neutralAction = `${actionBase} border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-400`;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm text-gray-600 mb-1">
          {label}
        </label>
      )}

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        // `hidden`, not `sr-only`: sr-only stays in the tab order, which puts an
        // invisible second stop next to the visible upload control.
        className="hidden"
        disabled={disabled}
        onChange={handleInput}
      />

      {shownUrl ? (
        <div className="flex items-start gap-3">
          <div
            {...dragProps}
            className={`relative shrink-0 overflow-hidden rounded-xl border bg-gray-50 ${
              dragging ? "border-primary" : "border-gray-200"
            }`}
            style={{ width: previewWidth, aspectRatio: aspect }}
          >
            <img src={shownUrl} alt="" className="w-full h-full object-cover" />
            <span
              className={`absolute top-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                isNew
                  ? "bg-primary text-white"
                  : "bg-white/90 text-gray-600 border border-gray-200"
              }`}
            >
              {isNew ? "New" : "Saved"}
            </span>
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <Loader2 size={18} className="animate-spin text-primary" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={openPicker}
                disabled={disabled || busy}
                title="Choose a different image"
                className={neutralAction}
              >
                <RefreshCw size={13} /> Replace
              </button>
              {isNew ? (
                <button
                  type="button"
                  onClick={() => {
                    setLocalError("");
                    onFileChange(null);
                  }}
                  disabled={disabled || busy}
                  title={existingUrl ? "Keep the saved image" : "Remove the selected image"}
                  className={
                    existingUrl
                      ? neutralAction
                      : `${actionBase} border-destructive/25 text-destructive hover:bg-destructive/5 hover:border-destructive/50`
                  }
                >
                  {existingUrl ? (
                    <>
                      <Undo2 size={13} /> Undo
                    </>
                  ) : (
                    <>
                      <Trash2 size={13} /> Remove
                    </>
                  )}
                </button>
              ) : null}
            </div>

            <p className="mt-1.5 text-[11px] leading-4 text-gray-500 break-words">
              {isNew
                ? `${file.name} · ${formatBytes(file.size)} · ${
                    existingUrl ? "replaces the saved image on save" : "uploads on save"
                  }`
                : "Currently saved on this record"}
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || busy}
          {...dragProps}
          className={`w-full flex items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-left transition-colors disabled:opacity-50 ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-gray-300 bg-gray-50/60 hover:bg-gray-50 hover:border-gray-400"
          }`}
        >
          <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg border border-gray-200 bg-white text-gray-500">
            {busy ? (
              <Loader2 size={16} className="animate-spin text-primary" />
            ) : (
              <ImagePlus size={16} />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-gray-700">
              {busy ? "Preparing…" : emptyLabel}
            </span>
            <span className="block text-xs text-gray-500">{hint || IMAGE_HINT}</span>
          </span>
        </button>
      )}

      {message && (
        <p className="mt-1.5 flex items-start gap-1 text-xs text-destructive">
          <X size={13} className="mt-px shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}
