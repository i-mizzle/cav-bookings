import mongoose, { Types } from "mongoose";

import {
  buildTimeWindows,
  ensureValidSlot,
  expandRange,
  isSlotWithinWindows,
  parseUtcDate,
  rangesOverlap,
  toSlot,
  type TimeRange,
} from "@/lib/booking";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getBusyTimes,
  isGoogleCalendarConfigured,
  normalizeBusyTimes,
} from "@/lib/googleCalendar";
import { connectToDatabase } from "@/lib/mongodb";
import { isResendConfigured, sendBookingConfirmationEmails } from "@/lib/resend";
import { Availability } from "@/models/Availability";
import { Booking } from "@/models/Booking";
import { Service } from "@/models/Service";

export const dynamic = "force-dynamic";

type CreateBookingRequestBody = {
  start?: string;
  name?: string;
  phone?: string;
  email?: string;
  serviceId?: string;
  userId?: string;
};

type ConfirmBookingRequestBody = {
  bookingId?: string;
  paymentReference?: string;
};

async function getService(serviceId: string) {
  if (!Types.ObjectId.isValid(serviceId)) {
    return null;
  }

  return Service.findById(serviceId)
    .select("name duration bufferBefore bufferAfter meetLinkRequired")
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

async function validateBookingSlot({
  slotStart,
  service,
  allowGoogleCalendarFailure = false,
}: {
  slotStart: Date;
  service: {
    duration: number;
    bufferBefore: number;
    bufferAfter: number;
  };
  allowGoogleCalendarFailure?: boolean;
}) {
  const slotError = ensureValidSlot(slotStart, service);

  if (slotError) {
    return { error: slotError, status: 400 as const };
  }

  const slot = toSlot(slotStart, service);
  const bufferedSlot = expandRange(slot, service.bufferBefore, service.bufferAfter);
  const bookingDate = parseUtcDate(slotStart.toISOString().slice(0, 10));

  if (!bookingDate) {
    return { error: "Invalid booking date.", status: 400 as const };
  }

  const rules = await Availability.find({ dayOfWeek: slotStart.getUTCDay() })
    .select("startTime endTime")
    .sort({ startTime: 1 })
    .lean();
  const windows = buildTimeWindows(bookingDate, rules);

  if (!isSlotWithinWindows(slot, windows)) {
    return {
      error: "Selected slot is outside configured availability.",
      status: 409 as const,
    };
  }

  const existingBlocks = await getExistingBookingBlocks(bufferedSlot.start, bufferedSlot.end);
  const hasDatabaseConflict = existingBlocks.some((range) => rangesOverlap(bufferedSlot, range));

  if (hasDatabaseConflict) {
    return { error: "Slot already booked.", status: 409 as const };
  }

  let busyBlocks: TimeRange[] = [];

  try {
    busyBlocks = normalizeBusyTimes(
      await getBusyTimes(bufferedSlot.start.toISOString(), bufferedSlot.end.toISOString())
    );
  } catch (error) {
    if (!allowGoogleCalendarFailure) {
      throw error;
    }

    console.warn("Unable to load Google Calendar busy times while validating booking.", error);
  }

  const hasCalendarConflict = busyBlocks.some((range) => rangesOverlap(bufferedSlot, range));

  if (hasCalendarConflict) {
    return { error: "Slot already booked.", status: 409 as const };
  }

  return {
    slot,
  };
}

function buildBookingDescription({
  serviceName,
  customerName,
  customerEmail,
  customerPhone,
  paymentReference,
}: {
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentReference: string;
}) {
  return [
    `Service: ${serviceName}`,
    `Client name: ${customerName}`,
    `Client email: ${customerEmail}`,
    `Client phone: ${customerPhone}`,
    `Payment reference: ${paymentReference}`,
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const body = (await request.json()) as CreateBookingRequestBody;

    if (!body.start || !body.email || !body.name || !body.phone || !body.serviceId) {
      return Response.json(
        { error: "start, name, phone, email, and serviceId are required." },
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

    const validationResult = await validateBookingSlot({
      slotStart,
      service,
      allowGoogleCalendarFailure: true,
    });

    if ("error" in validationResult) {
      return Response.json({ error: validationResult.error }, { status: validationResult.status });
    }

    const booking = await Booking.create({
      serviceId: new Types.ObjectId(body.serviceId),
      customerName: body.name.trim(),
      customerEmail: body.email.trim(),
      customerPhone: body.phone.trim(),
      userId: body.userId && Types.ObjectId.isValid(body.userId) ? new Types.ObjectId(body.userId) : undefined,
      start: validationResult.slot.start,
      end: validationResult.slot.end,
      status: "pending",
      paymentStatus: "pending",
    });

    return Response.json(
      {
        id: String(booking._id),
        serviceId: String(booking.serviceId),
        userId: booking.userId ? String(booking.userId) : null,
        start: booking.start.toISOString(),
        end: booking.end.toISOString(),
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        googleEventId: booking.googleEventId,
        meetLink: booking.meetLink,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create booking.";

    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let googleEventId = "";

  try {
    await connectToDatabase();

    const body = (await request.json()) as ConfirmBookingRequestBody;

    if (!body.bookingId || !body.paymentReference) {
      return Response.json(
        { error: "bookingId and paymentReference are required." },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(body.bookingId)) {
      return Response.json({ error: "Invalid bookingId." }, { status: 400 });
    }

    const booking = await Booking.findById(body.bookingId);

    if (!booking) {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.paymentStatus === "paid" && booking.status === "confirmed") {
      return Response.json(
        {
          id: String(booking._id),
          serviceId: String(booking.serviceId),
          start: booking.start.toISOString(),
          end: booking.end.toISOString(),
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          paymentReference: booking.paymentReference ?? "",
          googleEventId: booking.googleEventId,
          meetLink: booking.meetLink,
        },
        { status: 200 }
      );
    }

    const service = await getService(String(booking.serviceId));

    if (!service) {
      return Response.json({ error: "Service not found." }, { status: 404 });
    }

    const validationResult = await validateBookingSlot({
      slotStart: booking.start,
      service,
    });

    if ("error" in validationResult) {
      return Response.json({ error: validationResult.error }, { status: validationResult.status });
    }

    if (!isGoogleCalendarConfigured()) {
      return Response.json(
        { error: "Google Calendar credentials are not configured." },
        { status: 500 }
      );
    }

    const recipientEmails = [...new Set([
      booking.customerEmail,
      process.env.BOOKING_NOTIFICATION_EMAIL ?? process.env.GOOGLE_CLIENT_EMAIL,
    ].filter((email): email is string => Boolean(email && email.trim())))];

    const calendarEvent = await createCalendarEvent({
      start: validationResult.slot.start.toISOString(),
      end: validationResult.slot.end.toISOString(),
      summary: `${service.name} Booking`,
      description: buildBookingDescription({
        serviceName: service.name,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        paymentReference: body.paymentReference,
      }),
      createMeetLink: service.meetLinkRequired ?? false,
    });

    googleEventId = calendarEvent.eventId;

    booking.paymentReference = body.paymentReference;
    booking.paymentStatus = "paid";
    booking.status = "confirmed";
    booking.googleEventId = calendarEvent.eventId;
    booking.meetLink = calendarEvent.meetLink;
    await booking.save();

    if (isResendConfigured()) {
      await sendBookingConfirmationEmails({
        recipientEmails,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        serviceName: service.name,
        start: booking.start,
        end: booking.end,
        paymentReference: body.paymentReference,
        meetLink: booking.meetLink || undefined,
      });
    }

    return Response.json(
      {
        id: String(booking._id),
        serviceId: String(booking.serviceId),
        userId: booking.userId ? String(booking.userId) : null,
        start: booking.start.toISOString(),
        end: booking.end.toISOString(),
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentReference: booking.paymentReference,
        googleEventId: booking.googleEventId,
        meetLink: booking.meetLink,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
        emailSent: isResendConfigured(),
      },
      { status: 200 }
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

    const message = error instanceof Error ? error.message : "Failed to confirm booking.";

    if (googleEventId) {
      await deleteCalendarEvent(googleEventId).catch(() => undefined);
    }

    return Response.json({ error: message }, { status: 500 });
  }
}