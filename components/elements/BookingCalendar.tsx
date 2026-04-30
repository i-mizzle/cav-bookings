"use client";

import { useMemo, useState } from "react";
import ArrowIcon from "./icons/ArrowIcon";
import ModalWrapper from "../wrappers/ModalWrapper";
import moment from "moment";
import CheckIcon from "./icons/CheckIcon";

interface DateTimeSelection {
  date: Date
  time: string
}

interface BookingCalendarProps {
  // closeCalendar: () => void;
  returnSelection: (data: DateTimeSelection) => void;
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BookingCalendar({ returnSelection }: BookingCalendarProps) {
  const currentMonthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);
  const todayStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [visibleMonth, setVisibleMonth] = useState<Date>(currentMonthStart);

  const monthLabel = visibleMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const firstDayOfMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1
  );
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0
  ).getDate();

  const leadingEmptySlots = firstDayOfMonth.getDay();

  const canGoToPreviousMonth =
    visibleMonth.getFullYear() > currentMonthStart.getFullYear() ||
    (visibleMonth.getFullYear() === currentMonthStart.getFullYear() &&
      visibleMonth.getMonth() > currentMonthStart.getMonth());

  const goToPreviousMonth = () => {
    if (!canGoToPreviousMonth) return;

    setVisibleMonth(
      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setVisibleMonth(
      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
    );
  };

  const [activeDate, setActiveDate] = useState<Date | null>(null)
  const [timeslotSelectionOpen, setTimeslotSelectionOpen] = useState(false)

  const handleCalendarDateClick = (date: Date) => {
    // Placeholder for step 2 date click handling.
    setActiveDate(date)
    setTimeslotSelectionOpen(true)
  }

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number | null>(null)

  const timeSlots = [
    {
      label: "09:00 AM to 10:00 AM",
      value: "09:00-10:00"
    },
    {
      label: "10:00 AM to 11:00 AM",
      value: "10:00-11:00"
    },
    {
      label: "11:00 AM to 12:00 PM",
      value: "11:00-12:00"
    },
    {
      label: "12:00 PM to 01:00 PM",
      value: "12:00-13:00"
    },
    {
      label: "01:00 PM to 02:00 PM",
      value: "13:00-14:00"
    },
    {
      label: "02:00 PM to 03:00 PM",
      value: "14:00-15:00"
    },
    {
      label: "03:00 PM to 04:00 PM",
      value: "15:00-16:00"
    },
    {
      label: "04:00 PM to 05:00 PM",
      value: "16:00-17:00"
    },
    {
      label: "05:00 PM to 06:00 PM",
      value: "17:00-18:00"
    }
  ]

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
            const date = new Date(
              visibleMonth.getFullYear(),
              visibleMonth.getMonth(),
              day
            );
            const now = new Date();
            const isToday =
              date.getFullYear() === now.getFullYear() &&
              date.getMonth() === now.getMonth() &&
              date.getDate() === now.getDate();
            const isPastDate = date < todayStart;
            const isActiveDate =
              activeDate !== null &&
              date.getFullYear() === activeDate.getFullYear() &&
              date.getMonth() === activeDate.getMonth() &&
              date.getDate() === activeDate.getDate();

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
          setSelectedTimeSlot(null)
        } } 
        dialogTitle={`Select a time slot`} 
        maxWidthClass={"max-w-xl"}
      >
        <div className="w-full">
          <p className="text-sm font-sans">Select a timeslot for your booking on {moment(activeDate).format('dddd, LL')}</p>

          {timeSlots.map((slot, slotIndex) => (
            <button onClick={()=>{setSelectedTimeSlot(slotIndex)}} key={slotIndex} className={`w-full flex items-center justify-between transition duration-200 my-3 p-4 rounded-lg text-xs font-mono font-semibold border-2 bg-cav-medium-gray/30 text-left ${selectedTimeSlot === slotIndex ? 'border-cav-gold text-cav-gold' : 'border-cav-medium-gray text-cav-light-gray'}`}>
              {slot.label } 
              <span className={`w-4 h-4 transition-all duration-200 rounded-full bg-cav-gold flex items-center justify-center shadow-lg shadow-black ${selectedTimeSlot === slotIndex ? 'opacity-100' : 'opacity-0'}`}>
                <CheckIcon className="w-3 h-3 text-cav-black" />
              </span>
            </button>
          ))}

          <button 
            onClick={()=>{
              setTimeslotSelectionOpen(false)
              returnSelection({
                date: activeDate!,
                time: timeSlots[selectedTimeSlot as number].value
              })
            }} 
            className="font-mono mt-5 w-full transition active:shadow-none active:bg-cav-black active:text-cav-light-gray font-semibold p-4 text-xs rounded-full bg-cav-gold text-cav-black flex items-center justify-center shadow-xl shadow-black/30"
          >
            Confirm & Proceed
            <ArrowIcon className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </ModalWrapper>
    </>
  );
}
