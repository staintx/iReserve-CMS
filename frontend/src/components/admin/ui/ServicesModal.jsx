import React, { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Layers, AlertCircle, CheckCircle2, Search } from "lucide-react";
import Btn from "./Btn";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";

export default function ServicesModal({ isOpen = true, onClose, onServicesChanged }) {
  const { notify } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serviceName, setServiceName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const inputRef = useRef(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await AdminAPI.getServices();
      setServices(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      notify("Failed to load services list", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServices();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizedInput = serviceName.trim().toLowerCase();
  const isDuplicate = services.some(
    (s) => s.name && s.name.trim().toLowerCase() === normalizedInput
  );

  const handleAddService = async (e) => {
    if (e) e.preventDefault();
    const trimmed = serviceName.trim();
    if (!trimmed) return;

    if (isDuplicate) {
      notify(`Service "${trimmed}" already exists.`, "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await AdminAPI.createService({ name: trimmed });
      notify(`Service "${trimmed}" added successfully`, "success");
      setServiceName("");
      await fetchServices();
      if (onServicesChanged) onServicesChanged();
      inputRef.current?.focus();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create service";
      notify(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"? It will no longer appear in new bookings and packages.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await AdminAPI.deleteService(id);
      notify(`Service "${name}" removed`, "success");
      setServices((prev) => prev.filter((s) => s._id !== id));
      if (onServicesChanged) onServicesChanged();
    } catch (err) {
      notify("Failed to remove service", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredServices = services.filter((s) => {
    if (!searchTerm.trim()) return true;
    return s.name?.toLowerCase().includes(searchTerm.trim().toLowerCase());
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[88vh] overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="services-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Layers size={18} />
            </div>
            <div>
              <h2 id="services-modal-title" className="font-bold text-gray-900 text-base sm:text-lg">
                Add Services
              </h2>
              <p className="text-xs text-gray-500">
                Central source of truth for setup and catering services
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200/70 rounded-full text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Add Service Input Form */}
          <form onSubmit={handleAddService} className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
              New Service Name <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Enter service name..."
                  className={`w-full border rounded-lg px-3.5 py-2 text-sm bg-white focus:outline-none transition-colors ${
                    isDuplicate
                      ? "border-amber-400 focus:border-amber-500 bg-amber-50/20 text-gray-900"
                      : "border-gray-200 focus:border-primary text-gray-900"
                  }`}
                  disabled={submitting}
                />
              </div>
              <Btn
                type="submit"
                variant="primary"
                size="md"
                className="shrink-0"
                disabled={!serviceName.trim() || isDuplicate || submitting}
              >
                <Plus size={15} />
                <span>{submitting ? "Adding..." : "Add"}</span>
              </Btn>
            </div>

            {isDuplicate && (
              <p className="text-xs text-amber-600 flex items-center gap-1.5 font-medium pt-0.5">
                <AlertCircle size={13} />
                This service name is already in the list.
              </p>
            )}
          </form>

          {/* Divider */}
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-800 text-sm">Services</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                  {services.length}
                </span>
              </div>

              {/* Quick Filter */}
              {services.length > 5 && (
                <div className="relative w-44">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search services..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-gray-50/50"
                  />
                </div>
              )}
            </div>

            {/* List of Services */}
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Loading services from database...</span>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="py-8 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200 p-4">
                <p className="text-xs text-gray-500 font-medium">
                  {searchTerm ? "No services matching your search." : "No services added yet."}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Type a service name above and click "+ Add" to create one.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1 divide-y divide-gray-100/80">
                {filteredServices.map((service) => (
                  <li
                    key={service._id || service.name}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50/80 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-gray-800 break-words block leading-snug">
                          {service.name}
                        </span>
                        {service.description && (
                          <span className="text-[11px] text-gray-400 block truncate leading-tight">
                            {service.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/50 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Active
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(service._id, service.name)}
                        disabled={deletingId === service._id}
                        className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title={`Remove ${service.name}`}
                        aria-label={`Remove ${service.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500">
          <span>All services sync dynamically with packages and bookings.</span>
          <Btn variant="secondary" size="sm" onClick={onClose}>
            Done
          </Btn>
        </div>
      </div>
    </div>
  );
}
