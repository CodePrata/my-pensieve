import { computeFreeTime } from './free-time-calculation';

describe('computeFreeTime', () => {
  const now = atLocal(2026, 7, 7, 9, 0);
  const endOfDay = atLocal(2026, 7, 7, 23, 59, 59, 999);
  const minimumGapMinutes = 15;

  it('returns one window spanning now-to-end-of-day when there are no events', () => {
    const result = computeFreeTime(now, endOfDay, [], minimumGapMinutes);

    expect(result.windowCount).toBe(1);
    expect(result.windows).toHaveLength(1);
    expect(result.windows[0].start).toEqual(now);
    expect(result.windows[0].end).toEqual(endOfDay);
    expect(result.windows[0].durationMinutes).toBe(
      minutesBetween(now, endOfDay),
    );
    expect(result.totalFreeMinutes).toBe(result.windows[0].durationMinutes);
    expect(result.largestWindowMinutes).toBe(result.windows[0].durationMinutes);
  });

  it('returns two windows before and after a single middle event', () => {
    const events = [
      event('meeting', atLocal(2026, 7, 7, 12, 0), atLocal(2026, 7, 7, 13, 0)),
    ];

    const result = computeFreeTime(now, endOfDay, events, minimumGapMinutes);

    expect(result.windowCount).toBe(2);
    expect(result.windows[0].start).toEqual(now);
    expect(result.windows[0].end).toEqual(new Date(events[0].startTime));
    expect(result.windows[1].start).toEqual(new Date(events[0].endTime));
    expect(result.windows[1].end).toEqual(endOfDay);
    expect(result.totalFreeMinutes).toBe(
      result.windows[0].durationMinutes + result.windows[1].durationMinutes,
    );
    expect(result.largestWindowMinutes).toBe(
      Math.max(
        result.windows[0].durationMinutes,
        result.windows[1].durationMinutes,
      ),
    );
  });

  it('merges back-to-back events with no phantom gap between them', () => {
    const events = [
      event('first', atLocal(2026, 7, 7, 12, 0), atLocal(2026, 7, 7, 13, 0)),
      event('second', atLocal(2026, 7, 7, 13, 0), atLocal(2026, 7, 7, 14, 0)),
    ];

    const result = computeFreeTime(now, endOfDay, events, minimumGapMinutes);

    expect(result.windowCount).toBe(2);
    expect(result.windows[0].end).toEqual(new Date(events[0].startTime));
    expect(result.windows[1].start).toEqual(new Date(events[1].endTime));
    expect(
      result.windows.some(
        (window) =>
          window.start.getTime() === new Date(events[0].endTime).getTime() &&
          window.end.getTime() === new Date(events[1].startTime).getTime(),
      ),
    ).toBe(false);
  });

  it('merges overlapping events into one busy block', () => {
    const events = [
      event('first', atLocal(2026, 7, 7, 12, 0), atLocal(2026, 7, 7, 13, 30)),
      event('overlap', atLocal(2026, 7, 7, 13, 0), atLocal(2026, 7, 7, 14, 0)),
    ];

    const result = computeFreeTime(now, endOfDay, events, minimumGapMinutes);

    expect(result.windowCount).toBe(2);
    expect(result.windows[0].end).toEqual(new Date(events[0].startTime));
    expect(result.windows[1].start).toEqual(new Date(events[1].endTime));
  });

  it('excludes gaps shorter than minimumGapMinutes', () => {
    const events = [
      event('a', atLocal(2026, 7, 7, 10, 0), atLocal(2026, 7, 7, 10, 30)),
      event('b', atLocal(2026, 7, 7, 10, 40), atLocal(2026, 7, 7, 11, 0)),
    ];

    const result = computeFreeTime(now, endOfDay, events, minimumGapMinutes);

    expect(result.windowCount).toBe(2);
    expect(result.windows[0].end).toEqual(new Date(events[0].startTime));
    expect(result.windows[1].start).toEqual(new Date(events[1].endTime));
    expect(
      result.windows.some(
        (window) =>
          window.start.getTime() === new Date(events[0].endTime).getTime() &&
          window.end.getTime() === new Date(events[1].startTime).getTime(),
      ),
    ).toBe(false);
  });

  it('includes a gap exactly equal to minimumGapMinutes', () => {
    const gapStart = atLocal(2026, 7, 7, 10, 30);
    const gapEnd = atLocal(2026, 7, 7, 10, 45);
    const events = [
      event('before', atLocal(2026, 7, 7, 10, 0), gapStart),
      event('after', gapEnd, atLocal(2026, 7, 7, 11, 0)),
    ];

    const result = computeFreeTime(now, endOfDay, events, minimumGapMinutes);

    const exactGap = result.windows.find(
      (window) =>
        window.start.getTime() === gapStart.getTime() &&
        window.end.getTime() === gapEnd.getTime(),
    );

    expect(exactGap).toBeDefined();
    expect(exactGap!.durationMinutes).toBe(minimumGapMinutes);
  });

  it('treats an in-progress event as busy from now until its end', () => {
    const inProgressEnd = atLocal(2026, 7, 7, 10, 0);
    const events = [
      event('in-progress', atLocal(2026, 7, 7, 8, 0), inProgressEnd),
    ];

    const result = computeFreeTime(now, endOfDay, events, minimumGapMinutes);

    expect(result.windowCount).toBe(1);
    expect(result.windows[0].start).toEqual(inProgressEnd);
    expect(result.windows[0].end).toEqual(endOfDay);
    expect(
      result.windows.some((window) => window.end.getTime() === now.getTime()),
    ).toBe(false);
  });

  it('ignores all-day events so the full remaining day stays free', () => {
    const events = [
      allDayEvent(
        'birthday',
        atLocal(2026, 7, 7, 0, 0),
        atLocal(2026, 7, 8, 0, 0),
      ),
    ];

    const result = computeFreeTime(now, endOfDay, events, minimumGapMinutes);

    expect(result.windowCount).toBe(1);
    expect(result.windows).toHaveLength(1);
    expect(result.windows[0].start).toEqual(now);
    expect(result.windows[0].end).toEqual(endOfDay);
    expect(result.windows[0].durationMinutes).toBe(
      minutesBetween(now, endOfDay),
    );
    expect(result.totalFreeMinutes).toBe(result.windows[0].durationMinutes);
    expect(result.largestWindowMinutes).toBe(result.windows[0].durationMinutes);
  });

  it('ignores all-day events but still subtracts timed events from free time', () => {
    const events = [
      allDayEvent(
        'birthday',
        atLocal(2026, 7, 7, 0, 0),
        atLocal(2026, 7, 8, 0, 0),
      ),
      event('meeting', atLocal(2026, 7, 7, 12, 0), atLocal(2026, 7, 7, 14, 0)),
    ];

    const result = computeFreeTime(now, endOfDay, events, minimumGapMinutes);

    expect(result.windowCount).toBe(2);
    expect(result.windows[0].start).toEqual(now);
    expect(result.windows[0].end).toEqual(new Date(events[1].startTime));
    expect(result.windows[1].start).toEqual(new Date(events[1].endTime));
    expect(result.windows[1].end).toEqual(endOfDay);
    expect(result.totalFreeMinutes).toBe(
      result.windows[0].durationMinutes + result.windows[1].durationMinutes,
    );
  });

  it('derives totalFreeMinutes, largestWindowMinutes, and windowCount correctly', () => {
    const events = [
      event('a', atLocal(2026, 7, 7, 11, 0), atLocal(2026, 7, 7, 11, 30)),
      event('b', atLocal(2026, 7, 7, 12, 0), atLocal(2026, 7, 7, 12, 30)),
    ];

    const result = computeFreeTime(now, endOfDay, events, minimumGapMinutes);

    const durations = result.windows.map((window) => window.durationMinutes);

    expect(result.windowCount).toBe(result.windows.length);
    expect(result.totalFreeMinutes).toBe(
      durations.reduce((sum, duration) => sum + duration, 0),
    );
    expect(result.largestWindowMinutes).toBe(Math.max(...durations));
  });
});

function event(title: string, start: Date, end: Date) {
  return {
    externalId: `${title}-${start.toISOString()}`,
    title,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    allDay: false,
    isRecurring: false,
    source: 'test',
    lastSyncedAt: start.toISOString(),
  };
}

function allDayEvent(title: string, start: Date, end: Date) {
  return {
    ...event(title, start, end),
    allDay: true,
  };
}

function atLocal(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  ms = 0,
): Date {
  const date = new Date(year, month - 1, day, hour, minute, second, ms);
  return date;
}

function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}
