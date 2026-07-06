import type { SyncEventsResult } from "./types";

export type CalendarSyncOutcome =
  | { ok: true; result: SyncEventsResult }
  | { ok: false };

let calendarSyncPromise: Promise<CalendarSyncOutcome> | null = null;

/**
 * Ensures POST /calendar/sync runs at most once per page load, even when
 * React Strict Mode double-invokes effects in development.
 */
export function syncCalendarOnce(): Promise<CalendarSyncOutcome> {
  if (!calendarSyncPromise) {
    calendarSyncPromise = fetch("/calendar/sync", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) {
          return { ok: false as const };
        }
        const result = (await response.json()) as SyncEventsResult;
        return { ok: true as const, result };
      })
      .catch((): CalendarSyncOutcome => ({ ok: false }));
  }

  return calendarSyncPromise;
}
