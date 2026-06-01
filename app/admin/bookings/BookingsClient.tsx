"use client";

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ModalWrapper from "@/components/wrappers/ModalWrapper";
import Spinner from "@/components/elements/icons/Spinner";
import ArrowIcon from "@/components/elements/icons/ArrowIcon";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServicePricing {
  amount: number;
  type: "rolling" | "fixed" | "packaged";
  cycle?: string;
}

interface BookingService {
  id: string;
  name: string;
  slug: string;
  pricing: ServicePricing;
  packages: { name: string; pricing: number }[];
}

interface BookingItem {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  start: string;
  end: string;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "pending" | "paid";
  paymentReference: string | null;
  meetLink: string;
  service: BookingService | null;
  createdAt: string;
}

interface AvailabilitySlot {
  start: string;
  end: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayLocalDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-500/15 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-green-500/15 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingsClient() {
  // Bookings
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);

  // Availability
  const [availOpen, setAvailOpen] = useState(false);
  const [availDate, setAvailDate] = useState(todayLocalDate());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsFetched, setSlotsFetched] = useState(false);

  // ── Fetch bookings ──────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load bookings.");
      setBookings(data.bookings);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load bookings.");
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ── Fetch availability ──────────────────────────────────────────────────────
  const fetchAvailability = useCallback(async (date: string) => {
    setLoadingSlots(true);
    setSlotsFetched(false);
    try {
      const res = await fetch(`/api/availability?date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load availability.");
      setSlots(data.slots ?? []);
      setSlotsFetched(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load availability.");
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  function toggleAvailability() {
    if (!availOpen) {
      // Opening — fetch for the current date
      fetchAvailability(availDate);
    }
    setAvailOpen((prev) => !prev);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const date = e.target.value;
    setAvailDate(date);
    if (availOpen) {
      fetchAvailability(date);
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Availability panel ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-cav-medium-gray/40 bg-cav-dark-gray overflow-hidden shadow-xl shadow-black/20">
        <button
          onClick={toggleAvailability}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-sm font-semibold font-mono text-white">Availability</span>
          <ArrowIcon
            className={`w-4 h-4 text-cav-light-gray/60 transition-transform duration-200 ${
              availOpen ? "rotate-90" : "-rotate-90"
            }`}
          />
        </button>

        {availOpen && (
          <div className="px-5 pb-5 flex flex-col gap-4 border-t border-cav-medium-gray/30">
            <div className="pt-4 flex items-center gap-4">
              <div>
                <label className="text-xs font-mono text-gray-500 mb-1 block">Date</label>
                <input
                  type="date"
                  value={availDate}
                  onChange={handleDateChange}
                  className="rounded py-2.5 px-3 bg-black/20 text-xs border border-black/20 font-mono focus:outline-none transition"
                />
              </div>
              {loadingSlots && (
                <div className="mt-4">
                  <Spinner className="w-6 h-6 text-cav-light-gray animate-spin" />
                </div>
              )}
            </div>

            {!loadingSlots && slotsFetched && (
              slots.length === 0 ? (
                <p className="text-xs font-mono text-cav-light-gray/50">
                  No available slots for this date.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-cav-medium-gray/40 bg-black/20 px-3 py-1.5 text-xs font-mono text-cav-light-gray"
                    >
                      {formatSlotTime(slot.start)} – {formatSlotTime(slot.end)}
                    </span>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Bookings header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-mono text-cav-light-gray">
          {loadingBookings
            ? "Loading…"
            : `${bookings.length} booking${bookings.length !== 1 ? "s" : ""}`}
        </p>
        <button
          onClick={fetchBookings}
          className="rounded-lg border border-cav-medium-gray/50 bg-cav-medium-gray/20 px-4 py-2 text-xs font-mono font-medium text-cav-light-gray transition hover:bg-cav-medium-gray/40"
        >
          Refresh
        </button>
      </div>

      {/* ── Bookings list ──────────────────────────────────────────────────── */}
      {loadingBookings ? (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6 text-cav-light-gray" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-cav-medium-gray/40 bg-cav-dark-gray p-6 text-sm font-sans text-cav-light-gray text-center">
          No bookings yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <button
              key={booking.id}
              onClick={() => setSelectedBooking(booking)}
              className="flex w-full items-start justify-between rounded-xl border border-cav-medium-gray/40 bg-cav-dark-gray p-5 shadow-xl shadow-black/20 text-left transition hover:border-cav-medium-gray/70"
            >
              <div className="flex flex-col gap-1 min-w-0 pr-4">
                <p className="text-sm font-semibold font-mono text-white">
                  {booking.customerName}
                </p>
                <p className="text-xs font-mono text-cav-light-gray/60">
                  {booking.customerEmail}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono text-cav-light-gray/60">
                  <span>{formatDate(booking.start)}</span>
                  <span>·</span>
                  <span>
                    {formatTime(booking.start)} – {formatTime(booking.end)}
                  </span>
                  {booking.service && (
                    <>
                      <span>·</span>
                      <span>{booking.service.name}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-medium capitalize ${
                    STATUS_STYLES[booking.status] ?? ""
                  }`}
                >
                  {booking.status}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-medium capitalize ${
                    PAYMENT_STYLES[booking.paymentStatus] ?? ""
                  }`}
                >
                  {booking.paymentStatus}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Booking detail modal ───────────────────────────────────────────── */}
      <ModalWrapper
        shown={selectedBooking !== null}
        closeFunction={() => setSelectedBooking(null)}
        dialogTitle="Booking Details"
        maxWidthClass="max-w-xl"
      >
        {selectedBooking && <BookingDetail booking={selectedBooking} />}
      </ModalWrapper>
    </div>
  );
}

// ─── Booking detail panel ─────────────────────────────────────────────────────

function BookingDetail({ booking }: { booking: BookingItem }) {
  const pricing = booking.service?.pricing;

  function formatPricing() {
    if (!pricing) return "—";
    if (pricing.type === "packaged") {
      return `Packaged`;
    }
    const amount = `₦${pricing.amount.toLocaleString()}`;
    return pricing.cycle ? `${amount}/${pricing.cycle}` : amount;
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Customer */}
      <Section title="Customer">
        <Row label="Name" value={booking.customerName} />
        <Row label="Email" value={booking.customerEmail} />
        <Row label="Phone" value={booking.customerPhone} />
      </Section>

      {/* Appointment */}
      <Section title="Appointment">
        <Row label="Date" value={formatDate(booking.start)} />
        <Row
          label="Time"
          value={`${formatTime(booking.start)} – ${formatTime(booking.end)}`}
        />
        <Row
          label="Status"
          value={
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-medium capitalize ${
                STATUS_STYLES[booking.status] ?? ""
              }`}
            >
              {booking.status}
            </span>
          }
        />
        {booking.meetLink && (
          <Row
            label="Meet link"
            value={
              <a
                href={booking.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline break-all"
              >
                {booking.meetLink}
              </a>
            }
          />
        )}
      </Section>

      {/* Service */}
      {booking.service && (
        <Section title="Service">
          <Row label="Name" value={booking.service.name} />
          <Row label="Pricing" value={formatPricing()} />
          {pricing?.type === "packaged" && booking.service.packages.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              {booking.service.packages.map((pkg, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-cav-medium-gray/30 bg-black/20 px-3 py-2"
                >
                  <span className="text-xs font-mono text-cav-light-gray">{pkg.name}</span>
                  <span className="text-xs font-mono text-cav-light-gray/60">
                    ₦{pkg.pricing.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Payment */}
      <Section title="Payment">
        <Row
          label="Status"
          value={
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-medium capitalize ${
                PAYMENT_STYLES[booking.paymentStatus] ?? ""
              }`}
            >
              {booking.paymentStatus}
            </span>
          }
        />
        {booking.paymentReference && (
          <Row label="Reference" value={booking.paymentReference} />
        )}
        {booking.service && pricing && pricing.type !== "packaged" && (
          <Row label="Amount" value={`₦${pricing.amount.toLocaleString()}`} />
        )}
      </Section>

      <p className="text-[10px] font-mono text-cav-light-gray/30">
        Booked {new Date(booking.createdAt).toLocaleString("en-GB")}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-cav-light-gray/40">
        {title}
      </p>
      <div className="rounded-xl border border-cav-medium-gray/30 bg-black/20 px-4 py-3 flex flex-col gap-2.5">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-mono text-cav-light-gray/50 shrink-0">{label}</span>
      <span className="text-xs font-mono text-cav-light-gray text-right">{value}</span>
    </div>
  );
}
