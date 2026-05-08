"use client";

import { useEffect, useMemo, useState } from "react";
import ArrowIcon from "./icons/ArrowIcon";
import ModalWrapper from "../wrappers/ModalWrapper";
import CheckIcon from "./icons/CheckIcon";
import Spinner from "./icons/Spinner";

interface DateTimeSelection {
  date: Date
  time: string
}

interface BookingData {
  date: string
  timeSlot: string
}

interface BookingCalendarProps {
  returnSelection: (data: DateTimeSelection) => void;
  bookingData?: BookingData;
  serviceId?: string | null;
}

type AvailabilitySlot = {
  start: string;
  end: string;
};

type AvailabilityResponse = {
  slots?: AvailabilitySlot[];
  error?: string;
};

type SlotOption = {
  start: string;
  end: string;
  value: string;
  label: string;
};

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parseBookingDate = (dateValue?: string) => {
  if (!dateValue) return null;

  return new Date(`${dateValue}T00:00:00.000Z`);
};

const toUtcMonthStart = (date: Date) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
};

const toUtcDayStart = (date: Date) => {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const formatUtcDateKey = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatUtcDateLabel = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
};

const formatUtcTime = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(date);
};

const toTimeSlotValue = (start: Date, end: Date) => {
  const formatValuePart = (date: Date) => {
    const hours = `${date.getUTCHours()}`.padStart(2, "0");
    const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");

    return `${hours}:${minutes}`;
  };

  return `${formatValuePart(start)}-${formatValuePart(end)}`;
};

const toSlotOption = (slot: AvailabilitySlot): SlotOption => {
  const start = new Date(slot.start);
  const end = new Date(slot.end);

  return {
    start: slot.start,
    end: slot.end,
    value: toTimeSlotValue(start, end),
    label: `${formatUtcTime(start)} to ${formatUtcTime(end)} UTC`,
  };
};

export default function BookingCalendar({ returnSelection, bookingData, serviceId }: BookingCalendarProps) {
  const currentMonthStart = useMemo(() => {
    const now = new Date();
    return toUtcMonthStart(now);
  }, []);
  const todayStart = useMemo(() => {
    const now = new Date();
    return toUtcDayStart(now);
  }, []);

  const [visibleMonth, setVisibleMonth] = useState<Date>(currentMonthStart);
  const [activeDate, setActiveDate] = useState<Date | null>(parseBookingDate(bookingData?.date))
  const [timeslotSelectionOpen, setTimeslotSelectionOpen] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(bookingData?.timeSlot ?? null)
  const [availableSlots, setAvailableSlots] = useState<SlotOption[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const monthLabel = visibleMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const firstDayOfMonth = visibleMonth;
  const daysInMonth = new Date(
    Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const leadingEmptySlots = firstDayOfMonth.getUTCDay();

  const canGoToPreviousMonth =
    visibleMonth.getUTCFullYear() > currentMonthStart.getUTCFullYear() ||
    (visibleMonth.getUTCFullYear() === currentMonthStart.getUTCFullYear() &&
      visibleMonth.getUTCMonth() > currentMonthStart.getUTCMonth());

  const goToPreviousMonth = () => {
    if (!canGoToPreviousMonth) return;

    setVisibleMonth(
      new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() - 1, 1))
    );
  };

  const goToNextMonth = () => {
    setVisibleMonth(
      new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + 1, 1))
    );
  };

  useEffect(() => {
    const incomingDate = parseBookingDate(bookingData?.date);

    setActiveDate(incomingDate);
    setSelectedTimeSlot(bookingData?.timeSlot ?? null);

    if (incomingDate) {
      setVisibleMonth(toUtcMonthStart(incomingDate));
    }
  }, [bookingData?.date, bookingData?.timeSlot]);

  useEffect(() => {
    if (!activeDate || !serviceId) {
      setAvailableSlots([])
      setSlotsError(null)
      return
    }

    const abortController = new AbortController()

    const loadAvailability = async () => {
      try {
        setLoadingSlots(true)
        setSlotsError(null)

        const searchParams = new URLSearchParams({
          date: formatUtcDateKey(activeDate),
          serviceId,
        })
        const response = await fetch(`/api/availability?${searchParams.toString()}`, {
          signal: abortController.signal,
          cache: "no-store",
        })
        const data = (await response.json()) as AvailabilityResponse

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load availability.")
        }

        const nextSlots = (data.slots ?? []).map(toSlotOption)
        setAvailableSlots(nextSlots)
        setSelectedTimeSlot((currentValue) =>
          currentValue && nextSlots.some((slot) => slot.value === currentValue) ? currentValue : null
        )
      } catch (error) {
        if (abortController.signal.aborted) return

        console.error("Unable to load availability.", error)
        setAvailableSlots([])
        setSlotsError(error instanceof Error ? error.message : "Failed to load availability.")
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingSlots(false)
        }
      }
    }

    void loadAvailability()

    return () => {
      abortController.abort()
    }
  }, [activeDate, serviceId])

  const handleCalendarDateClick = (date: Date) => {
    setActiveDate(date)
    const incomingDate = parseBookingDate(bookingData?.date)
    const shouldKeepCurrentTimeSlot =
      incomingDate !== null &&
      bookingData?.timeSlot &&
      isSameDay(incomingDate, date)

    setSelectedTimeSlot(shouldKeepCurrentTimeSlot ? bookingData.timeSlot : null)
    setTimeslotSelectionOpen(true)
  }

  const isSameDay = (first: Date, second: Date) => {
    return (
      first.getUTCFullYear() === second.getUTCFullYear() &&
      first.getUTCMonth() === second.getUTCMonth() &&
      first.getUTCDate() === second.getUTCDate()
    );
  };

  const isSlotPast = (slotStartIso: string) => {
    return new Date() > new Date(slotStartIso);
  };

  return (
    <>
      <div className="w-full rounded-xl border-2 border-cav-medium-gray bg-cav-dark-gray/80 p-4 shadow-lg shadow-black/40">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={goToPreviousMonth}
            disabled={!canGoToPreviousMonth}
            className="h-9 w-9 rounded-full flex items-center justify-center border border-cav-medium-gray bg-cav-black text-cav-light-gray transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous month"
          >
            <ArrowIcon className="w-5 h-5" />
          </button>

          <p className="font-mono text-sm font-semibold tracking-wide text-cav-gold">
            {monthLabel}
          </p>

          <button
            type="button"
            onClick={goToNextMonth}
            className="h-9 w-9 rounded-full flex items-center justify-center border border-cav-medium-gray bg-cav-black text-cav-light-gray transition active:scale-95"
            aria-label="Next month"
          >
            <ArrowIcon className="w-5 h-5 rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {WEEK_DAYS.map((day) => (
            <p
              key={day}
              className="text-center text-[11px] font-mono uppercase tracking-wide text-cav-gold/80"
            >
              {day}
            </p>
          ))}

          {Array.from({ length: leadingEmptySlots }).map((_, index) => (
            <div key={`empty-${index}`} className="h-10" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const date = new Date(Date.UTC(
              visibleMonth.getUTCFullYear(),
              visibleMonth.getUTCMonth(),
              day
            ));
            const now = new Date();
            const isToday = isSameDay(date, now);
            const isPastDate = date < todayStart;
            const isActiveDate =
              activeDate !== null &&
              date.getUTCFullYear() === activeDate.getUTCFullYear() &&
              date.getUTCMonth() === activeDate.getUTCMonth() &&
              date.getUTCDate() === activeDate.getUTCDate();

            return (
              <button
                key={`${visibleMonth.getMonth()}-${day}`}
                type="button"
                onClick={() => handleCalendarDateClick(date)}
                disabled={isPastDate}
                className={`h-10 w-10 rounded-full border bg-cav-black/80 text-sm font-mono transition ${isActiveDate ? "border-cav-gold text-cav-gold" : "border-cav-medium-gray text-cav-light-gray"} ${isPastDate ? "opacity-40" : "hover:border-cav-gold/80 hover:text-cav-gold active:scale-95"}`}
                aria-label={`Select ${date.toDateString()}`}
              >
                <span className="flex h-full w-full relative flex-col items-center justify-center leading-none">
                  <span>{day}</span>
                  {isToday && <span className="absolute bottom-0 left-auto right-auto h-1 w-1 rounded-full bg-cav-gold" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ModalWrapper 
        shown={timeslotSelectionOpen} 
        closeFunction={()=>{
          setTimeslotSelectionOpen(false)
        } } 
        dialogTitle={`Select a time slot`} 
        maxWidthClass={"max-w-xl"}
      >
        <div className="w-full">
          <p className="text-sm font-sans">Select a UTC timeslot for your booking on {activeDate ? formatUtcDateLabel(activeDate) : "your selected date"}</p>
          {/* <p className="mt-1 text-xs font-mono text-cav-light-gray">Only backend-approved UTC slots are shown here.</p> */}

          {loadingSlots && 
            <div className="w-full min-h-50 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center">
              <Spinner className="animate-spin w-8 h-8 text-cav-light-gray" />
              <p className="font-sans text-xs">Loading available time slots</p>
              </div>
            </div>}

          {!loadingSlots && slotsError && <p className="mt-4 text-sm font-sans text-red-300">{slotsError}</p>}

          {!loadingSlots && !slotsError && availableSlots.length === 0 && (
            <p className="mt-4 text-sm font-sans text-cav-light-gray">No slots are available for this date.</p>
          )}

          {!loadingSlots && !slotsError && availableSlots.map((slot) => {
            const slotIsPast = isSlotPast(slot.start);

            return (
              <button
                onClick={()=>{setSelectedTimeSlot(slot.value)}}
                key={slot.start}
                disabled={slotIsPast}
                className={`w-full flex items-center justify-between transition duration-200 my-3 p-4 rounded-lg text-xs font-mono font-semibold border-2 bg-cav-medium-gray/30 text-left ${selectedTimeSlot === slot.value ? 'border-cav-gold text-cav-gold' : 'border-cav-medium-gray text-cav-light-gray'} ${slotIsPast ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <span>{slot.label }</span>
                <span className="flex items-center gap-2">
                  {slotIsPast && (
                    <span className="text-[10px] uppercase tracking-wide text-cav-light-gray">
                      Unavailable
                    </span>
                  )}
                  <span className={`w-4 h-4 transition-all duration-200 rounded-full bg-cav-gold flex items-center justify-center shadow-lg shadow-black ${selectedTimeSlot === slot.value ? 'opacity-100' : 'opacity-0'}`}>
                    <CheckIcon className="w-3 h-3 text-cav-black" />
                  </span>
                </span>
              </button>
            );
          })}

          <button 
            disabled={!activeDate || !selectedTimeSlot}
            onClick={()=>{
              const selectedSlot = availableSlots.find((slot) => slot.value === selectedTimeSlot)
              if (!activeDate || !selectedSlot) return

              setTimeslotSelectionOpen(false)
              returnSelection({
                date: activeDate,
                time: selectedSlot.value
              })
            }} 
            className="font-mono mt-5 w-full transition active:shadow-none active:bg-cav-black active:text-cav-light-gray font-semibold p-4 text-xs rounded-full bg-cav-gold text-cav-black flex items-center justify-center shadow-xl shadow-black/30 disabled:cursor-not-allowed disabled:bg-cav-gold/50 disabled:text-cav-black/60 disabled:shadow-none"
          >
            Confirm & Proceed
            <ArrowIcon className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </ModalWrapper>
    </>
  );
}
