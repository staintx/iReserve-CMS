import React, { useState, useEffect, useRef } from "react";
import { X, Layers, AlertCircle, Plus } from "lucide-react";
import Btn from "../ui/Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export default function QuickServiceCreateModal({
  isOpen,
  initialName = "",
  existingServices = [],
  onClose,
  onCreateSuccess,
}) {
  const { notify } = useToast();
  const [serviceName, setServiceName] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setServiceName(initialName || "");
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const normalized = serviceName.trim().toLowerCase();
  const isDuplicate = (existingServices || []).some(
    (s) => (s?.name || s || "").trim().toLowerCase() === normalized
  );

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = serviceName.trim();
    if (!trimmed) {
      notify("Please enter a service name", "error");
      return;
    }

    if (isDuplicate) {
      notify(`Service "${trimmed}" already exists.`, "error");
      return;
    }

    setLoading(true);
    try {
      const res = await AdminAPI.createService({ name: trimmed });
      const created = res.data;
      notify(`Service "${trimmed}" created and added to package`, "success");
      if (onCreateSuccess) {
        onCreateSuccess(created || { name: trimmed });
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create service";
      notify(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-service-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers size={16} />
            </div>
            <h3 id="create-service-title" className="font-bold text-gray-900 text-sm sm:text-base">
              Create New Service
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-200/60 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Service Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. LED Wall Setup, Acoustic Band"
              className={`w-full border rounded-lg px-3.5 py-2 text-sm bg-white focus:outline-none transition-colors ${
                isDuplicate
                  ? "border-amber-400 focus:border-amber-500 bg-amber-50/20 text-gray-900"
                  : "border-gray-200 focus:border-primary text-gray-900"
              }`}
              disabled={loading}
              required
            />
            {isDuplicate && (
              <p className="text-xs text-amber-600 flex items-center gap-1 font-medium mt-1">
                <AlertCircle size={12} />
                A service with this name already exists.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <Btn variant="secondary" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Btn>
            <Btn
              type="submit"
              variant="primary"
              size="sm"
              disabled={!serviceName.trim() || isDuplicate || loading}
            >
              <Plus size={13} />
              <span>{loading ? "Adding..." : "Add Service"}</span>
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
