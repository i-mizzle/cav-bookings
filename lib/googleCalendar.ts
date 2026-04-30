import { google } from "googleapis";

type CalendarBusySlot = {
  start?: string | null;
  end?: string | null;
};

function getCalendarConfig() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    return null;
  }

  return {
    clientEmail,
    privateKey,
    calendarId: process.env.GOOGLE_CALENDAR_ID ?? "primary",
  };
}

function getCalendarClient() {
  const config = getCalendarConfig();

  if (!config) {
    throw new Error("Google Calendar credentials are not configured.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: config.clientEmail,
      private_key: config.privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return {
    calendarId: config.calendarId,
    client: google.calendar({ version: "v3", auth }),
  };
}

export function isGoogleCalendarConfigured() {
  return getCalendarConfig() !== null;
}

export async function getBusyTimes(start: string, end: string) {
  const { client, calendarId } = getCalendarClient();
  const response = await client.freebusy.query({
    requestBody: {
      timeMin: start,
      timeMax: end,
      items: [{ id: calendarId }],
    },
  });

  return response.data.calendars?.[calendarId]?.busy ?? [];
}

export async function createCalendarEvent({
  start,
  end,
  email,
}: {
  start: string;
  end: string;
  email: string;
}) {
  const { client, calendarId } = getCalendarClient();
  const response = await client.events.insert({
    calendarId,
    conferenceDataVersion: 1,
    requestBody: {
      summary: "Booking",
      start: { dateTime: start },
      end: { dateTime: end },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
        },
      },
    },
  });

  return {
    eventId: response.data.id ?? "",
    meetLink:
      response.data.conferenceData?.entryPoints?.find(
        (entryPoint) => entryPoint.entryPointType === "video"
      )?.uri ?? response.data.hangoutLink ?? "",
  };
}

export async function deleteCalendarEvent(eventId: string) {
  if (!eventId) {
    return;
  }

  const { client, calendarId } = getCalendarClient();
  await client.events.delete({
    calendarId,
    eventId,
  });
}

export function normalizeBusyTimes(busySlots: CalendarBusySlot[]) {
  return busySlots
    .filter((slot) => slot.start && slot.end)
    .map((slot) => ({
      start: new Date(slot.start as string),
      end: new Date(slot.end as string),
    }))
    .filter((slot) => !Number.isNaN(slot.start.getTime()) && !Number.isNaN(slot.end.getTime()));
}