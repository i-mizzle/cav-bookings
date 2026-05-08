import { google } from "googleapis";

type CalendarBusySlot = {
  start?: string | null;
  end?: string | null;
};

const GOOGLE_API_TIMEOUT_MS = 8000;

function isServiceAccountEmail(value: string) {
  return value.endsWith(".iam.gserviceaccount.com");
}

function formatGoogleCalendarError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("The operation was aborted")) {
      return "Google Calendar request timed out before completion.";
    }

    if (error.message.includes("oauth2.googleapis.com/token failed")) {
      return "Google Calendar token request failed. Check GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, and outbound network access.";
    }

    return error.message;
  }

  return "Google Calendar request failed.";
}

function getCalendarConfig() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey || !isServiceAccountEmail(clientEmail)) {
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
  try {
    const { client, calendarId } = getCalendarClient();
    const response = await client.freebusy.query(
      {
        requestBody: {
          timeMin: start,
          timeMax: end,
          items: [{ id: calendarId }],
        },
      },
      {
        timeout: GOOGLE_API_TIMEOUT_MS,
      }
    );

    return response.data.calendars?.[calendarId]?.busy ?? [];
  } catch (error) {
    throw new Error(formatGoogleCalendarError(error));
  }
}

export async function createCalendarEvent({
  start,
  end,
  summary,
  description,
  createMeetLink,
}: {
  start: string;
  end: string;
  summary: string;
  description: string;
  createMeetLink: boolean;
}) {
  try {
    const { client, calendarId } = getCalendarClient();
    const response = await client.events.insert(
      {
        calendarId,
        conferenceDataVersion: createMeetLink ? 1 : 0,
        requestBody: {
          summary,
          description,
          start: { dateTime: start },
          end: { dateTime: end },
          ...(createMeetLink
            ? {
                conferenceData: {
                  createRequest: {
                    requestId: crypto.randomUUID(),
                  },
                },
              }
            : {}),
        },
      },
      {
        timeout: GOOGLE_API_TIMEOUT_MS,
      }
    );

    return {
      eventId: response.data.id ?? "",
      meetLink:
        response.data.conferenceData?.entryPoints?.find(
          (entryPoint) => entryPoint.entryPointType === "video"
        )?.uri ?? response.data.hangoutLink ?? "",
    };
  } catch (error) {
    throw new Error(formatGoogleCalendarError(error));
  }
}

export async function deleteCalendarEvent(eventId: string) {
  if (!eventId) {
    return;
  }

  try {
    const { client, calendarId } = getCalendarClient();
    await client.events.delete(
      {
        calendarId,
        eventId,
      },
      {
        timeout: GOOGLE_API_TIMEOUT_MS,
      }
    );
  } catch (error) {
    throw new Error(formatGoogleCalendarError(error));
  }
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