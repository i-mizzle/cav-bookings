type TimeRange = {
  start: Date;
  end: Date;
};

type TimeWindow = {
  start: Date;
  end: Date;
};

type ServiceConfig = {
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  duration: 60,
  bufferBefore: 0,
  bufferAfter: 0,
};

export function parseUtcDate(dateParam: string | null) {
  if (!dateParam || !DATE_ONLY_PATTERN.test(dateParam)) {
    return null;
  }

  const parsed = new Date(`${dateParam}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toUtcDate(date: Date, time: string) {
  const match = TIME_PATTERN.exec(time);

  if (!match) {
    throw new Error(`Invalid time value: ${time}`);
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours,
      minutes,
      0,
      0
    )
  );
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function ceilToHour(date: Date) {
  const rounded = new Date(date);
  rounded.setUTCMinutes(0, 0, 0);

  if (date.getUTCMinutes() > 0 || date.getUTCSeconds() > 0 || date.getUTCMilliseconds() > 0) {
    rounded.setUTCHours(rounded.getUTCHours() + 1);
  }

  return rounded;
}

export function isTopOfHour(date: Date) {
  return (
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

export function rangesOverlap(left: TimeRange, right: TimeRange) {
  return left.start < right.end && left.end > right.start;
}

export function mergeRanges(ranges: TimeRange[]) {
  if (ranges.length === 0) {
    return [];
  }

  const sorted = [...ranges].sort((left, right) => left.start.getTime() - right.start.getTime());
  const merged: TimeRange[] = [sorted[0]];

  for (let index = 1; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = merged[merged.length - 1];

    if (current.start <= previous.end) {
      if (current.end > previous.end) {
        previous.end = current.end;
      }
      continue;
    }

    merged.push({ ...current });
  }

  return merged;
}

export function expandRange(range: TimeRange, beforeMinutes: number, afterMinutes: number) {
  return {
    start: addMinutes(range.start, beforeMinutes * -1),
    end: addMinutes(range.end, afterMinutes),
  };
}

export function buildTimeWindows(
  date: Date,
  rules: Array<{ startTime: string; endTime: string }>
) {
  return rules
    .map((rule) => ({
      start: toUtcDate(date, rule.startTime),
      end: toUtcDate(date, rule.endTime),
    }))
    .filter((window) => window.end > window.start)
    .sort((left, right) => left.start.getTime() - right.start.getTime());
}

export function isSlotWithinWindows(slot: TimeRange, windows: TimeWindow[]) {
  return windows.some(
    (window) => slot.start >= window.start && slot.end <= window.end
  );
}

export function generateHourlySlots({
  windows,
  service,
  blocked,
}: {
  windows: TimeWindow[];
  service: ServiceConfig;
  blocked: TimeRange[];
}) {
  const mergedBlocked = mergeRanges(blocked);
  const slots: Array<{ start: string; end: string }> = [];

  for (const window of windows) {
    let slotStart = ceilToHour(window.start);

    while (addMinutes(slotStart, service.duration) <= window.end) {
      const slot = {
        start: slotStart,
        end: addMinutes(slotStart, service.duration),
      };
      const candidate = expandRange(slot, service.bufferBefore, service.bufferAfter);
      const hasConflict = mergedBlocked.some((range) => rangesOverlap(candidate, range));

      if (!hasConflict) {
        slots.push({
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
        });
      }

      slotStart = addMinutes(slotStart, 60);
    }
  }

  return slots;
}

export function ensureValidSlot(date: Date, service: ServiceConfig) {
  if (!isTopOfHour(date)) {
    return "Bookings must start at the top of the hour.";
  }

  if (service.duration !== 60) {
    return "Only 60-minute services are supported.";
  }

  return null;
}

export function toSlot(date: Date, service: ServiceConfig) {
  return {
    start: date,
    end: addMinutes(date, service.duration),
  };
}

export type { ServiceConfig, TimeRange, TimeWindow };