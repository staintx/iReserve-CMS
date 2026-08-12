import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, Undo2, X } from "lucide-react";
import { IMAGE_ACCEPT_ATTR, IMAGE_HINT, prepareImageFiles, thumbnailUrl } from "../../../lib/imageFiles";

/**
 * A thumbnail grid for fields that hold many photos.
 *
 * Saved images and newly picked ones live in the same grid but are labelled
 * differently, and removing a saved one only *marks* it — the record is not
 * touched until the parent form is submitted.
 *
 * Props:
 *  - existing            saved image URLs on the record
 *  - removedExisting     saved URLs the admin has marked for removal
 *  - onToggleExisting    (url) => void — flips a saved image in/out of that list
 *  - files               newly picked Files, owned by the parent
 *  - onFilesChange       (File[]) => void
 *  - maxNew              per-save upload cap (matches the route's maxCount)
 */
export default function MultiImageField({
  label,
  hint,
  existing = [],
  removedExisting = [],
  onToggleExisting,
  files = [],
  onFilesChange,
  maxNew = 10,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const keptExisting = existing.filter((url) => !removedExisting.includes(url));

  const add = async (picked) => {
    // A second drop landing mid-prepare would compose its result from a stale
    // `files`, silently dropping the first batch.
    if (!picked?.length || busy) return;
    setErrors([]);
    setBusy(true);
    const { files: prepared, errors: issues } = await prepareImageFiles(picked);
    setBusy(false);

    const room = maxNew - files.length;
    const accepted = prepared.slice(0, Math.max(room, 0));
    const messages = [...issues];
    if (prepared.length > accepted.length) {
      messages.push(`You can upload ${maxNew} photos per save. ${prepared.length - accepted.length} were left out.`);
    }
    setErrors(messages);
    if (accepted.length) onFilesChange([...files, ...accepted]);
  };

  const handleInput = (event) => {
    add(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    add(event.dataTransfer.files);
  };

  const tileBase =
    "group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100 transition-colors hover:border-gray-400";

  const tileAction =
    "absolute top-1 right-1 flex items-center justify-center w-6 h-6 rounded-md border border-gray-200 bg-white/95 text-gray-600 transition-colors hover:bg-destructive hover:border-destructive hover:text-white";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        {label && <label className="block text-sm text-gray-600">{label}</label>}
        {(existing.length > 0 || files.length > 0) && (
          <p className="text-xs text-gray-500">
            {keptExisting.length} saved
            {files.length > 0 && ` · ${files.length} new`}
            {removedExisting.length > 0 && ` · ${removedExisting.length} removed on save`}
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        multiple
        // `hidden`, not `sr-only`: sr-only stays in the tab order as an
        // unlabelled stop next to the visible Add control.
        className="hidden"
        disabled={disabled}
        onChange={handleInput}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          // Moving onto a tile fires dragleave on the container too, which
          // would flicker the highlight across the whole grid.
          if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
        }}
        onDrop={handleDrop}
        className={`rounded-xl border p-2 transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50/60"
        }`}
      >
        {existing.length === 0 && files.length === 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || busy}
            className="w-full flex items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-white/60 px-4 py-3 text-left hover:bg-white hover:border-gray-400 transition-colors disabled:opacity-50"
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
                {busy ? "Preparing…" : "Add photos"}
              </span>
              <span className="block text-xs text-gray-500">
                {hint || `Drag and drop or browse · ${IMAGE_HINT}`}
              </span>
            </span>
          </button>
        ) : (
          /* Geometry is inline: `.admin-layout :where(.grid)` in admin.css has the
             same specificity as `grid-cols-*` and is loaded later, so utility
             classes for the template lose the tie inside the admin shell. */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
              gap: "6px",
            }}
          >
            {existing.map((url) => {
              const removed = removedExisting.includes(url);
              return (
                <div key={url} className={tileBase}>
                  <button
                    type="button"
                    onClick={() => setLightbox(url)}
                    className="block w-full h-full cursor-zoom-in"
                    title="View larger"
                  >
                    {/* Thumbnail rendition only — the lightbox still opens the original. */}
                    <img
                      src={thumbnailUrl(url)}
                      alt=""
                      loading="lazy"
                      className={`w-full h-full object-cover transition-opacity ${
                        removed ? "opacity-20" : ""
                      }`}
                    />
                  </button>

                  {removed ? (
                    <button
                      type="button"
                      onClick={() => onToggleExisting(url)}
                      disabled={disabled}
                      title="Keep this photo"
                      className="absolute inset-0 flex items-center justify-center bg-destructive/15"
                    >
                      <span className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-white/95 px-1.5 py-1 text-[11px] font-semibold text-destructive">
                        <Undo2 size={12} /> Undo
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onToggleExisting(url)}
                      disabled={disabled}
                      title="Remove on save"
                      aria-label="Remove this saved photo on save"
                      className={tileAction}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className={tileBase}>
                <button
                  type="button"
                  onClick={() => previews[index] && setLightbox(previews[index])}
                  className="block w-full h-full cursor-zoom-in"
                  title={`${file.name} — view larger`}
                >
                  {previews[index] && (
                    <img src={previews[index]} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
                <span className="absolute bottom-1 left-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  New
                </span>
                <button
                  type="button"
                  onClick={() => onFilesChange(files.filter((_, i) => i !== index))}
                  disabled={disabled}
                  title="Remove"
                  aria-label={`Remove ${file.name}`}
                  className={tileAction}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || busy || files.length >= maxNew}
              className="aspect-square flex flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-gray-300 bg-white/60 text-gray-500 hover:bg-white hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40"
            >
              {busy ? <Loader2 size={16} className="animate-spin text-primary" /> : <Plus size={16} />}
              <span className="text-[11px] font-semibold">Add</span>
            </button>
          </div>
        )}
      </div>

      {(existing.length > 0 || files.length > 0) && (
        <p className="mt-1.5 text-xs text-gray-500">
          {hint || `${IMAGE_HINT} · up to ${maxNew} new photos per save`}
        </p>
      )}

      {errors.map((message) => (
        <p key={message} className="mt-1.5 flex items-start gap-1 text-xs text-destructive">
          <X size={13} className="mt-px shrink-0" />
          {message}
        </p>
      ))}

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-gray-700 hover:bg-white"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
