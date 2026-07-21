import { FreeTimeResult, FreeWindow } from './free-time.interface';

/** Minimal event shape needed for free-time math — decoupled from CalendarService. */
export interface FreeTimeEventInput {
  startTime: string;
  endTime: string;
  allDay: boolean;
}

interface BusyInterval {
  start: Date;
  end: Date;
}

/**
 * Pure free-time calculation — no I/O, fully deterministic given fixed inputs.
 */
export function computeFreeTime(
  now: Date,
  endOfDay: Date,
  events: FreeTimeEventInput[],
  minimumGapMinutes: number,
): FreeTimeResult {
  const busyBlocks = mergeBusyBlocks(
    events
      .filter((event) => !event.allDay)
      .map((event) => clipEventToRange(event, now, endOfDay))
      .filter((block): block is BusyInterval => block !== null),
  );

  const windows = deriveFreeWindows(
    now,
    endOfDay,
    busyBlocks,
    minimumGapMinutes,
  );

  return buildFreeTimeResult(windows);
}

function clipEventToRange(
  event: FreeTimeEventInput,
  rangeStart: Date,
  rangeEnd: Date,
): BusyInterval | null {
  const eventStart = new Date(event.startTime);
  const eventEnd = new Date(event.endTime);

  const start = new Date(
    Math.max(eventStart.getTime(), rangeStart.getTime()),
  );
  const end = new Date(Math.min(eventEnd.getTime(), rangeEnd.getTime()));

  if (start.getTime() >= end.getTime()) {
    return null;
  }

  return { start, end };
}

function mergeBusyBlocks(intervals: BusyInterval[]): BusyInterval[] {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const merged: BusyInterval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = merged[merged.length - 1];
    const next = sorted[i];

    if (next.start.getTime() <= current.end.getTime()) {
      current.end = new Date(
        Math.max(current.end.getTime(), next.end.getTime()),
      );
    } else {
      merged.push({ ...next });
    }
  }

  return merged;
}

function deriveFreeWindows(
  now: Date,
  endOfDay: Date,
  busyBlocks: BusyInterval[],
  minimumGapMinutes: number,
): FreeWindow[] {
  const windows: FreeWindow[] = [];
  let cursor = now.getTime();

  for (const busy of busyBlocks) {
    if (cursor < busy.start.getTime()) {
      const window = createWindow(new Date(cursor), busy.start);
      if (window.durationMinutes >= minimumGapMinutes) {
        windows.push(window);
      }
    }
    cursor = Math.max(cursor, busy.end.getTime());
  }

  if (cursor < endOfDay.getTime()) {
    const window = createWindow(new Date(cursor), endOfDay);
    if (window.durationMinutes >= minimumGapMinutes) {
      windows.push(window);
    }
  }

  return windows;
}

function createWindow(start: Date, end: Date): FreeWindow {
  return {
    start,
    end,
    durationMinutes: Math.round((end.getTime() - start.getTime()) / 60_000),
  };
}

function buildFreeTimeResult(windows: FreeWindow[]): FreeTimeResult {
  const totalFreeMinutes = windows.reduce(
    (sum, window) => sum + window.durationMinutes,
    0,
  );
  const largestWindowMinutes = windows.reduce(
    (max, window) => Math.max(max, window.durationMinutes),
    0,
  );

  return {
    windows,
    totalFreeMinutes,
    largestWindowMinutes,
    windowCount: windows.length,
  };
}
