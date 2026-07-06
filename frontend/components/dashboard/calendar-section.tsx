"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { syncCalendarOnce } from "@/lib/calendar-sync";
import { formatEventSchedule } from "@/lib/format-event-time";
import type { CalendarEvent } from "@/lib/types";

export function CalendarSection() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncing, setSyncing] = useState(true);
  const [syncFailed, setSyncFailed] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCalendar() {
      setSyncing(true);
      setSyncFailed(false);
      setEventsError(null);

      const syncOutcome = await syncCalendarOnce();
      if (cancelled) return;

      if (!syncOutcome.ok) {
        setSyncFailed(true);
      }

      try {
        const response = await fetch("/calendar/events");
        if (!response.ok) {
          throw new Error(`Failed to load events (${response.status})`);
        }
        const data = (await response.json()) as CalendarEvent[];
        if (!cancelled) {
          setEvents(data);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Failed to load events";
          setEventsError(message);
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    }

    void loadCalendar();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="rounded-lg border border-border bg-card shadow-none ring-0">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">
          Calendar
        </CardTitle>
        <CardDescription className="text-xs">
          Synced from Google Calendar on each dashboard load.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {syncing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className="inline-block size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              aria-hidden="true"
            />
            Syncing calendar…
          </div>
        )}

        {syncFailed && !syncing && (
          <Alert variant="destructive">
            <AlertTitle>Sync unavailable</AlertTitle>
            <AlertDescription>
              Couldn&apos;t refresh — showing last synced data.
            </AlertDescription>
          </Alert>
        )}

        {eventsError && (
          <Alert variant="destructive">
            <AlertTitle>Events unavailable</AlertTitle>
            <AlertDescription>{eventsError}</AlertDescription>
          </Alert>
        )}

        {!syncing && !eventsError && events.length === 0 && (
          <p className="text-sm text-muted-foreground">No events synced yet.</p>
        )}

        {!eventsError && events.length > 0 && (
          <ul className="divide-y divide-border">
            {events.map((event) => (
              <li key={event.externalId} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{event.title}</p>
                  {event.allDay ? (
                    <Badge variant="secondary">All day</Badge>
                  ) : (
                    <Badge variant="outline">Timed</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatEventSchedule(event)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
