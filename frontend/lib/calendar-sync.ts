import type { SyncEventsResult } from "./types";

interface CalendarSyncErrorBody {
  errorType?: string;
  reauthUrl?: string;
}

export type CalendarSyncOutcome =
  | { ok: true; result: SyncEventsResult }
  | { ok: false; errorType?: "auth_expired"; reauthUrl?: string };

let calendarSyncPromise: Promise<CalendarSyncOutcome> | null = null;

async function parseSyncFailure(
  response: Response,
): Promise<Extract<CalendarSyncOutcome, { ok: false }>> {
  try {
    const body = (await response.json()) as CalendarSyncErrorBody;
    if (body.errorType === "auth_expired" && typeof body.reauthUrl === "string") {
      return { ok: false, errorType: "auth_expired", reauthUrl: body.reauthUrl };
    }
  } catch {
    // Non-JSON or older error shape — fall through to generic failure.
  }

  return { ok: false };
}

/**
 * Ensures POST /calendar/sync runs at most once per page load, even when
 * React Strict Mode double-invokes effects in development.
 */
export function syncCalendarOnce(): Promise<CalendarSyncOutcome> {
  if (!calendarSyncPromise) {
    calendarSyncPromise = fetch("/calendar/sync", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) {
          return parseSyncFailure(response);
        }
        const result = (await response.json()) as SyncEventsResult;
        return { ok: true as const, result };
      })
      .catch((): CalendarSyncOutcome => ({ ok: false }));
  }

  return calendarSyncPromise;
}
