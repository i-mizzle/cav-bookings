import { Types } from "mongoose";

import {
  DEFAULT_SERVICE_CONFIG,
  buildTimeWindows,
  expandRange,
  generateHourlySlots,
  parseUtcDate,
  type TimeRange,
  type ServiceConfig,
} from "@/lib/booking";
import { getBusyTimes, normalizeBusyTimes } from "@/lib/googleCalendar";
import { connectToDatabase } from "@/lib/mongodb";
import { Availability } from "@/models/Availability";
import { Booking } from "@/models/Booking";
import { Service } from "@/models/Service";

export const dynamic = "force-dynamic";

async function getServiceConfig(serviceId: string | null): Promise<ServiceConfig> {
  if (!serviceId) {
    return DEFAULT_SERVICE_CONFIG;
  }

  if (!Types.ObjectId.isValid(serviceId)) {
    throw new Error("Invalid serviceId.");
  }

  const service = await Service.findById(serviceId)
    .select("duration bufferBefore bufferAfter")
    .lean();

  if (!service) {
    throw new Error("Service not found.");
  }

  return {
    duration: service.duration,
    bufferBefore: service.bufferBefore,
    bufferAfter: service.bufferAfter,
  };
}

async function getBookingBlockers(windowStart: Date, windowEnd: Date) {
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
    const service = serviceMap.get(String(booking.serviceId)) ?? DEFAULT_SERVICE_CONFIG;
    return expandRange(
      {
        start: new Date(booking.start),
        end: new Date(booking.end),
      },
      service.bufferBefore,
      service.bufferAfter
    );
  });
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const date = parseUtcDate(searchParams.get("date"));

    if (!date) {
      return Response.json(
        { error: "A valid UTC date is required in YYYY-MM-DD format." },
        { status: 400 }
      );
    }

    let service: ServiceConfig;

    try {
      service = await getServiceConfig(searchParams.get("serviceId"));
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid service." },
        { status: error instanceof Error && error.message === "Service not found." ? 404 : 400 }
      );
    }

    const rules = await Availability.find({ dayOfWeek: date.getUTCDay() })
      .select("startTime endTime")
      .sort({ startTime: 1 })
      .lean();

    if (rules.length === 0) {
      return Response.json({ date: date.toISOString(), slots: [] });
    }

    const windows = buildTimeWindows(date, rules);
    const windowStart = windows[0]?.start;
    const windowEnd = windows[windows.length - 1]?.end;

    if (!windowStart || !windowEnd) {
      return Response.json({ date: date.toISOString(), slots: [] });
    }

    const bookingBlocks = await getBookingBlockers(windowStart, windowEnd);
    let busyBlocks: TimeRange[] = [];

    try {
      busyBlocks = normalizeBusyTimes(
        await getBusyTimes(windowStart.toISOString(), windowEnd.toISOString())
      );
    } catch (error) {
      console.warn("Unable to load Google Calendar busy times for availability.", error);
    }

    const slots = generateHourlySlots({
      windows,
      service,
      blocked: [...bookingBlocks, ...busyBlocks],
    });

    return Response.json({
      date: date.toISOString(),
      slots,
      calendarUnavailable: busyBlocks.length === 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load availability.";
    return Response.json({ error: message }, { status: 500 });
  }
}