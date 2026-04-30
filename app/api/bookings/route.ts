import mongoose, { Types } from "mongoose";

import {
  buildTimeWindows,
  ensureValidSlot,
  expandRange,
  isSlotWithinWindows,
  parseUtcDate,
  rangesOverlap,
  toSlot,
} from "@/lib/booking";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getBusyTimes,
  isGoogleCalendarConfigured,
  normalizeBusyTimes,
} from "@/lib/googleCalendar";
import { connectToDatabase } from "@/lib/mongodb";
import { Availability } from "@/models/Availability";
import { Booking } from "@/models/Booking";
import { Service } from "@/models/Service";

export const dynamic = "force-dynamic";

type BookingRequestBody = {
  start?: string;
  email?: string;
  serviceId?: string;
  userId?: string;
};

async function getService(serviceId: string) {
  if (!Types.ObjectId.isValid(serviceId)) {
    return null;
  }

  return Service.findById(serviceId)
    .select("name duration bufferBefore bufferAfter")
    .lean();
}

async function getExistingBookingBlocks(windowStart: Date, windowEnd: Date) {
  const bookings = await Booking.find({
    start: { $lt: windowEnd },
    end: { $gt: windowStart },
    status: "confirmed",
  })
    .select("serviceId start end")
    .lean();

  const serviceIds = [...new Set(bookings.map((booking) => String(booking.serviceId)))];
  const services = await Service.find({ _id: { $in: serviceIds } })
    .select("duration bufferBefore bufferAfter")
    .lean();
  const serviceMap = new Map(
    services.map((service) => [
      String(service._id),
      {
        duration: service.duration,
        bufferBefore: service.bufferBefore,
        bufferAfter: service.bufferAfter,
      },
    ])
  );

  return bookings.map((booking) => {
    const service = serviceMap.get(String(booking.serviceId));

    return expandRange(
      {
        start: new Date(booking.start),
        end: new Date(booking.end),
      },
      service?.bufferBefore ?? 0,
      service?.bufferAfter ?? 0
    );
  });
}

export async function POST(request: Request) {
  let googleEventId = "";

  try {
    await connectToDatabase();

    const body = (await request.json()) as BookingRequestBody;

    if (!body.start || !body.email || !body.serviceId) {
      return Response.json(
        { error: "start, email, and serviceId are required." },
        { status: 400 }
      );
    }

    const slotStart = new Date(body.start);

    if (Number.isNaN(slotStart.getTime())) {
      return Response.json({ error: "Invalid start value." }, { status: 400 });
    }

    const service = await getService(body.serviceId);

    if (!service) {
      return Response.json({ error: "Service not found." }, { status: 404 });
    }

    const slotError = ensureValidSlot(slotStart, service);

    if (slotError) {
      return Response.json({ error: slotError }, { status: 400 });
    }

    const slot = toSlot(slotStart, service);
    const bufferedSlot = expandRange(slot, service.bufferBefore, service.bufferAfter);
    const bookingDate = parseUtcDate(slotStart.toISOString().slice(0, 10));

    if (!bookingDate) {
      return Response.json({ error: "Invalid booking date." }, { status: 400 });
    }

    const rules = await Availability.find({ dayOfWeek: slotStart.getUTCDay() })
      .select("startTime endTime")
      .sort({ startTime: 1 })
      .lean();
    const windows = buildTimeWindows(bookingDate, rules);

    if (!isSlotWithinWindows(slot, windows)) {
      return Response.json(
        { error: "Selected slot is outside configured availability." },
        { status: 409 }
      );
    }

    const existingBlocks = await getExistingBookingBlocks(bufferedSlot.start, bufferedSlot.end);
    const hasDatabaseConflict = existingBlocks.some((range) => rangesOverlap(bufferedSlot, range));

    if (hasDatabaseConflict) {
      return Response.json({ error: "Slot already booked." }, { status: 409 });
    }

    const busyBlocks = normalizeBusyTimes(
      await getBusyTimes(bufferedSlot.start.toISOString(), bufferedSlot.end.toISOString())
    );
    const hasCalendarConflict = busyBlocks.some((range) => rangesOverlap(bufferedSlot, range));

    if (hasCalendarConflict) {
      return Response.json({ error: "Slot already booked." }, { status: 409 });
    }

    if (!isGoogleCalendarConfigured()) {
      return Response.json(
        { error: "Google Calendar credentials are not configured." },
        { status: 500 }
      );
    }

    const calendarEvent = await createCalendarEvent({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      email: body.email,
    });

    googleEventId = calendarEvent.eventId;

    const booking = await Booking.create({
      serviceId: new Types.ObjectId(body.serviceId),
      userId: body.userId && Types.ObjectId.isValid(body.userId) ? new Types.ObjectId(body.userId) : undefined,
      start: slot.start,
      end: slot.end,
      status: "confirmed",
      googleEventId: calendarEvent.eventId,
      meetLink: calendarEvent.meetLink,
    });

    return Response.json(
      {
        id: String(booking._id),
        serviceId: String(booking.serviceId),
        userId: booking.userId ? String(booking.userId) : null,
        start: booking.start.toISOString(),
        end: booking.end.toISOString(),
        status: booking.status,
        googleEventId: booking.googleEventId,
        meetLink: booking.meetLink,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof mongoose.Error &&
      "code" in error &&
      typeof error.code === "number" &&
      error.code === 11000
    ) {
      if (googleEventId) {
        await deleteCalendarEvent(googleEventId).catch(() => undefined);
      }

      return Response.json({ error: "Slot just got booked." }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : "Failed to create booking.";

    if (googleEventId) {
      await deleteCalendarEvent(googleEventId).catch(() => undefined);
    }

    return Response.json({ error: message }, { status: 500 });
  }
}