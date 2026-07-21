"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

export function CalendarSection() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncing, setSyncing] = useState(true);
  const [syncFailed, setSyncFailed] = useState(false);
  const [syncReauthUrl, setSyncReauthUrl] = useState<string | null>(null);
  const [showReconnectRefreshBanner, setShowReconnectRefreshBanner] =
    useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  function handleReconnectClick() {
    if (!syncReauthUrl) return;
    window.open(syncReauthUrl, "_blank", "noopener,noreferrer");
    setShowReconnectRefreshBanner(true);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadCalendar() {
      setSyncing(true);
      setSyncFailed(false);
      setSyncReauthUrl(null);
      setEventsError(null);

      const syncOutcome = await syncCalendarOnce();
      if (cancelled) return;

      if (!syncOutcome.ok) {
        setSyncFailed(true);
        if (syncOutcome.errorType === "auth_expired" && syncOutcome.reauthUrl) {
          setSyncReauthUrl(syncOutcome.reauthUrl);
        }
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
    <>
      {showReconnectRefreshBanner && (
        <div
          role="status"
          className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 shadow-sm"
        >
          <p className="text-sm text-foreground">
            Reconnected? Refresh the page to see your calendar.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" onClick={() => window.location.reload()}>
              Refresh
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowReconnectRefreshBanner(false)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

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
              <p className="mb-0">Couldn&apos;t refresh — showing last synced data.</p>
              {syncReauthUrl && (
                <button
                  type="button"
                  onClick={handleReconnectClick}
                  className={cn(buttonVariants({ variant: "default" }), "mt-1.5")}
                >
                  Reconnect Google Calendar
                </button>
              )}
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
    </>
  );
}
