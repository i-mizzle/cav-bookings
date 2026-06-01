"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ModalWrapper from "@/components/wrappers/ModalWrapper";
import TextField from "@/components/elements/form/TextField";
import FormButton from "@/components/elements/form/FormButton";
import Spinner from "@/components/elements/icons/Spinner";
import TrashIcon from "@/components/elements/icons/TrashIcon";

interface ServicePricing {
  amount: number;
  type: "rolling" | "fixed" | "packaged";
  cycle?: string;
}

interface ServiceItem {
  id: string;
  order: number;
  name: string;
  slug: string;
  description: string;
  pricing: ServicePricing;
  packages: { name: string; pricing: number }[];
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  meetLinkRequired: boolean;
}

interface PackageEntry {
  name: string;
  pricing: string;
}

interface ServiceFormState {
  name: string;
  slug: string;
  description: string;
  pricingAmount: string;
  pricingType: "rolling" | "fixed" | "packaged";
  pricingCycle: string;
  packages: PackageEntry[];
  duration: string;
  bufferBefore: string;
  bufferAfter: string;
  order: string;
  meetLinkRequired: boolean;
}

const EMPTY_FORM: ServiceFormState = {
  name: "",
  slug: "",
  description: "",
  pricingAmount: "",
  pricingType: "fixed",
  pricingCycle: "",
  packages: [],
  duration: "60",
  bufferBefore: "0",
  bufferAfter: "0",
  order: "0",
  meetLinkRequired: false,
};

function serviceToForm(s: ServiceItem): ServiceFormState {
  return {
    name: s.name,
    slug: s.slug,
    description: s.description,
    pricingAmount: String(s.pricing.amount),
    pricingType: s.pricing.type,
    pricingCycle: s.pricing.cycle ?? "",
    packages: (s.packages ?? []).map((p) => ({ name: p.name, pricing: String(p.pricing) })),
    duration: String(s.duration),
    bufferBefore: String(s.bufferBefore),
    bufferAfter: String(s.bufferAfter),
    order: String(s.order),
    meetLinkRequired: s.meetLinkRequired,
  };
}

function buildSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function validate(form: ServiceFormState): Record<string, boolean> {
  const packageErrors = form.pricingType === "packaged"
    ? form.packages.reduce((acc, pkg, i) => {
        if (!pkg.name.trim()) acc[`pkg_name_${i}`] = true;
        if (!pkg.pricing || isNaN(Number(pkg.pricing)) || Number(pkg.pricing) < 0) acc[`pkg_pricing_${i}`] = true;
        return acc;
      }, {} as Record<string, boolean>)
    : {};

  return {
    name: !form.name.trim(),
    slug: !form.slug.trim(),
    description: !form.description.trim(),
    pricingAmount: !form.pricingAmount || isNaN(Number(form.pricingAmount)) || Number(form.pricingAmount) < 0,
    duration: !form.duration || isNaN(Number(form.duration)) || Number(form.duration) < 60,
    packages: form.pricingType === "packaged" && form.packages.length === 0,
    ...packageErrors,
  };
}

export default function ServicesClient() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceItem | null>(null);

  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/services");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load services.");
      setServices(data.services);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load services.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setErrors({});
    setCreateOpen(true);
  }

  function openEdit(service: ServiceItem) {
    setForm(serviceToForm(service));
    setErrors({});
    setEditTarget(service);
  }

  function closeCreate() {
    setCreateOpen(false);
  }

  function closeEdit() {
    setEditTarget(null);
  }

  function setField<K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-generate slug when name changes (only for new services)
      if (key === "name" && !editTarget) {
        next.slug = buildSlug(value as string);
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [key]: false }));
  }

  async function handleCreate() {
    const errs = validate(form);
    if (Object.values(errs).some(Boolean)) {
      setErrors(errs);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description,
          pricing: {
            amount: Number(form.pricingAmount),
            type: form.pricingType,
            ...(form.pricingCycle ? { cycle: form.pricingCycle } : {}),
          },
          packages: form.pricingType === "packaged"
            ? form.packages.map((p) => ({ name: p.name, pricing: Number(p.pricing) }))
            : [],
          duration: Number(form.duration),
          bufferBefore: Number(form.bufferBefore),
          bufferAfter: Number(form.bufferAfter),
          order: Number(form.order),
          meetLinkRequired: form.meetLinkRequired,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create service.");
      toast.success("Service created.");
      setCreateOpen(false);
      await fetchServices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create service.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate() {
    if (!editTarget) return;

    const errs = validate(form);
    if (Object.values(errs).some(Boolean)) {
      setErrors(errs);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/services/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description,
          pricing: {
            amount: Number(form.pricingAmount),
            type: form.pricingType,
            ...(form.pricingCycle ? { cycle: form.pricingCycle } : {}),
          },
          packages: form.pricingType === "packaged"
            ? form.packages.map((p) => ({ name: p.name, pricing: Number(p.pricing) }))
            : [],
          duration: Number(form.duration),
          bufferBefore: Number(form.bufferBefore),
          bufferAfter: Number(form.bufferAfter),
          order: Number(form.order),
          meetLinkRequired: form.meetLinkRequired,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update service.");
      toast.success("Service updated.");
      setEditTarget(null);
      await fetchServices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update service.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(service: ServiceItem) {
    const confirmed = window.confirm(`Delete \"${service.name}\"? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    setDeletingServiceId(service.id);
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete service.");
      toast.success("Service deleted.");
      await fetchServices();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete service.");
    } finally {
      setDeletingServiceId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-mono text-cav-light-gray">
          {loading ? "Loading…" : `${services.length} service${services.length !== 1 ? "s" : ""}`}
        </p>
        <button
          onClick={openCreate}
          className="rounded-lg bg-cav-gold px-4 py-2 text-xs font-semibold font-mono text-black transition hover:bg-cav-dark-gold"
        >
          + New Service
        </button>
      </div>

      {/* Service list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6 text-cav-light-gray animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-xl border border-cav-medium-gray/40 bg-cav-dark-gray p-6 text-sm font-sans text-cav-light-gray text-center">
          No services yet. Create one to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex w-full items-start justify-between rounded-xl border border-cav-medium-gray/40 bg-cav-dark-gray p-5 shadow-xl shadow-black/20"
            >
              <div className="flex flex-col gap-1 min-w-0 pr-4">
                <p className="text-sm font-semibold font-mono text-white">{service.name}</p>
                <p className="text-xs font-mono text-cav-light-gray/60">/{service.slug}</p>
                <p className="mt-1 text-xs font-sans text-cav-light-gray/80 leading-relaxed line-clamp-2">
                  {service.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-mono text-cav-light-gray/60">
                  <span>
                    ₦{service.pricing.amount}
                    {service.pricing.cycle ? `/${service.pricing.cycle}` : ""}{" "}
                    <span className="text-cav-light-gray/40">({service.pricing.type})</span>
                  </span>
                  <span>{service.duration} min</span>
                  {(service.bufferBefore > 0 || service.bufferAfter > 0) && (
                    <span>
                      buffer {service.bufferBefore}/{service.bufferAfter} min
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => openEdit(service)}
                  className="rounded-lg border border-cav-medium-gray/50 bg-cav-medium-gray px-4 py-2 text-xs font-mono font-medium text-cav-light-gray transition hover:bg-cav-medium-gray/40"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(service)}
                  disabled={deletingServiceId === service.id}
                  aria-label={`Delete ${service.name}`}
                  className="rounded-lg bg-red-500/5 p-2 text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <ModalWrapper
        shown={createOpen}
        closeFunction={closeCreate}
        dialogTitle="New Service"
        maxWidthClass="max-w-xl"
      >
        <ServiceForm
          form={form}
          errors={errors}
          setField={setField}
          submitting={submitting}
          onSubmit={handleCreate}
          submitLabel="Create Service"
        />
      </ModalWrapper>

      {/* Edit modal */}
      <ModalWrapper
        shown={editTarget !== null}
        closeFunction={closeEdit}
        dialogTitle="Edit Service"
        maxWidthClass="max-w-xl"
      >
        <ServiceForm
          form={form}
          errors={errors}
          setField={setField}
          submitting={submitting}
          onSubmit={handleUpdate}
          submitLabel="Save"
        />
      </ModalWrapper>
    </div>
  );
}

interface ServiceFormProps {
  form: ServiceFormState;
  errors: Record<string, boolean>;
  setField: <K extends keyof ServiceFormState>(key: K, value: ServiceFormState[K]) => void;
  submitting: boolean;
  onSubmit: () => void;
  submitLabel: string;
}

function PackagesEditor({
  packages,
  errors,
  disabled,
  onChange,
}: {
  packages: PackageEntry[];
  errors: Record<string, boolean>;
  disabled: boolean;
  onChange: (pkgs: PackageEntry[]) => void;
}) {
  function addPackage() {
    onChange([...packages, { name: "", pricing: "" }]);
  }

  function removePackage(index: number) {
    onChange(packages.filter((_, i) => i !== index));
  }

  function updatePackage(index: number, field: keyof PackageEntry, value: string) {
    onChange(packages.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium font-mono text-gray-500">
          <span className="text-red-300">*</span> Packages
          {errors.packages && (
            <span className="ml-2 text-red-400">— at least 1 required</span>
          )}
        </label>
        <button
          type="button"
          onClick={addPackage}
          disabled={disabled}
          className="text-xs font-mono text-white/60 hover:text-white transition disabled:opacity-40"
        >
          + Add package
        </button>
      </div>

      {packages.length === 0 && (
        <p className="text-xs font-mono text-cav-light-gray/40 italic">No packages yet. Add at least one.</p>
      )}

      {packages.map((pkg, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex-1">
            <input
              type="text"
              value={pkg.name}
              placeholder="Package name (e.g. 1 video)"
              disabled={disabled}
              onChange={(e) => updatePackage(i, "name", e.target.value)}
              className={`rounded py-3 px-4 bg-black/20 text-xs block w-full focus:outline-none border transition duration-200 font-mono placeholder:text-gray-600 ${
                errors[`pkg_name_${i}`] ? "border-red-600/50" : "border-black/20"
              }`}
            />
          </div>
          <div className="w-32">
            <input
              type="number"
              value={pkg.pricing}
              placeholder="Price (₦)"
              disabled={disabled}
              onChange={(e) => updatePackage(i, "pricing", e.target.value)}
              className={`rounded py-3 px-4 bg-black/20 text-xs block w-full focus:outline-none border transition duration-200 font-mono placeholder:text-gray-600 ${
                errors[`pkg_pricing_${i}`] ? "border-red-600/50" : "border-black/20"
              }`}
            />
          </div>
          <button
            type="button"
            onClick={() => removePackage(i)}
            disabled={disabled}
            className="mt-2.5 text-xs text-red-400/60 hover:text-red-400 transition font-mono disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function ServiceForm({ form, errors, setField, submitting, onSubmit, submitLabel }: ServiceFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField
          requiredField
          inputLabel="Name"
          inputPlaceholder="e.g. Monthly Coaching"
          inputType="text"
          hasError={!!errors.name}
          returnFieldValue={(v) => setField("name", v as string)}
          preloadValue={form.name}
          disabled={submitting}
        />
        <TextField
          requiredField
          inputLabel="Slug"
          inputPlaceholder="e.g. monthly-coaching"
          inputType="text"
          hasError={!!errors.slug}
          returnFieldValue={(v) => setField("slug", v as string)}
          preloadValue={form.slug}
          disabled={submitting}
        />
      </div>

      <TextField
        requiredField
        inputLabel="Description"
        inputPlaceholder="Brief description of the service"
        inputType="text"
        hasError={!!errors.description}
        returnFieldValue={(v) => setField("description", v as string)}
        preloadValue={form.description}
        disabled={submitting}
      />

      <div className="grid grid-cols-2 gap-4">
        <TextField
          requiredField
          inputLabel="Price (₦)"
          inputPlaceholder="e.g. 150"
          inputType="number"
          hasError={!!errors.pricingAmount}
          returnFieldValue={(v) => setField("pricingAmount", v as string)}
          preloadValue={form.pricingAmount}
          disabled={submitting}
        />
        <div>
          <label className="text-xs font-medium font-mono text-gray-500 mb-1 block">
            <span className="text-red-300">*</span> Pricing Type
          </label>
          <select
            value={form.pricingType}
            onChange={(e) => setField("pricingType", e.target.value as ServiceFormState["pricingType"])}
            disabled={submitting}
            className="rounded py-4 px-4 bg-black/20 text-xs block w-full focus:border-black focus:outline-none border border-black/20 transition duration-200 font-mono"
          >
            <option value="fixed">Fixed</option>
            <option value="rolling">Rolling</option>
            <option value="packaged">Packaged</option>
          </select>
        </div>
      </div>

      {form.pricingType === "rolling" && (
        <div>
          <label className="text-xs font-medium font-mono text-gray-500 mb-1 block">
            Billing Cycle
          </label>
          <select
            value={form.pricingCycle}
            onChange={(e) => setField("pricingCycle", e.target.value)}
            disabled={submitting}
            className="rounded py-4 px-4 bg-black/20 text-xs block w-full focus:border-black focus:outline-none border border-black/20 transition duration-200 font-mono"
          >
            <option value="">Select cycle</option>
            <option value="hourly">hourly</option>
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
          </select>
        </div>
      )}

      {form.pricingType === "packaged" && (
        <PackagesEditor
          packages={form.packages}
          errors={errors}
          disabled={submitting}
          onChange={(pkgs) => setField("packages", pkgs)}
        />
      )}

      <div className="grid grid-cols-3 gap-4">
        <TextField
          requiredField
          inputLabel="Duration (min)"
          inputPlaceholder="60"
          inputType="number"
          hasError={!!errors.duration}
          returnFieldValue={(v) => setField("duration", v as string)}
          preloadValue={form.duration}
          disabled={submitting}
        />
        <TextField
          requiredField={false}
          inputLabel="Buffer Before (min)"
          inputPlaceholder="0"
          inputType="number"
          hasError={false}
          returnFieldValue={(v) => setField("bufferBefore", v as string)}
          preloadValue={form.bufferBefore}
          disabled={submitting}
        />
        <TextField
          requiredField={false}
          inputLabel="Buffer After (min)"
          inputPlaceholder="0"
          inputType="number"
          hasError={false}
          returnFieldValue={(v) => setField("bufferAfter", v as string)}
          preloadValue={form.bufferAfter}
          disabled={submitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          requiredField={false}
          inputLabel="Display Order"
          inputPlaceholder="0"
          inputType="number"
          hasError={false}
          returnFieldValue={(v) => setField("order", v as string)}
          preloadValue={form.order}
          disabled={submitting}
        />
        <div className="flex items-center gap-3 pt-6">
          <input
            id="meetLinkRequired"
            type="checkbox"
            checked={form.meetLinkRequired}
            onChange={(e) => setField("meetLinkRequired", e.target.checked)}
            disabled={submitting}
            className="w-4 h-4 accent-white cursor-pointer"
          />
          <label htmlFor="meetLinkRequired" className="text-xs font-mono text-gray-500 cursor-pointer">
            Meet link required
          </label>
        </div>
      </div>

      <div className="mt-2">
        <FormButton
          buttonLabel={submitLabel}
          buttonAction={onSubmit}
          processing={submitting}
        />
      </div>
    </div>
  );
}
