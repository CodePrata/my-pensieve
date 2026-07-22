"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatFreeTime } from "@/lib/format-free-time";
import type {
  LiveBriefingData,
  LiveNarrationResult,
  PushBriefingError,
  PushBriefingResult,
} from "@/lib/types";

const PUSH_ERROR_MESSAGES: Record<string, string> = {
  telegram_auth_failed:
    "Telegram bot token is invalid or revoked. Check the backend configuration.",
  telegram_chat_not_found:
    "Message the bot on Telegram first, then try again.",
  transient: "Couldn't reach Telegram. Try again in a moment.",
};

const briefingCardClassName =
  "rounded-xl border border-accent-peach/30 bg-briefing-surface shadow-none ring-0 [--card-spacing:--spacing(6)]";

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span
        className="inline-block size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

function formatDueDate(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

async function loadLiveBriefingData(): Promise<LiveBriefingData> {
  const response = await fetch("/briefing/live-data");
  if (!response.ok) {
    throw new Error(`Failed to load briefing data (${response.status})`);
  }
  return (await response.json()) as LiveBriefingData;
}

async function loadLiveNarrationData(): Promise<LiveNarrationResult> {
  const response = await fetch("/briefing/live-narration");
  if (!response.ok) {
    throw new Error(`Failed to load narration (${response.status})`);
  }
  return (await response.json()) as LiveNarrationResult;
}

export function BriefingSection() {
  const [liveData, setLiveData] = useState<LiveBriefingData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [narration, setNarration] = useState<LiveNarrationResult | null>(null);
  const [narrationLoading, setNarrationLoading] = useState(true);
  const [narrationError, setNarrationError] = useState<string | null>(null);

  const [pushState, setPushState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [pushErrorMessage, setPushErrorMessage] = useState<string | null>(
    null,
  );

  const dataRequestId = useRef(0);
  const narrationRequestId = useRef(0);

  const runLiveDataFetch = useCallback(async (requestId: number) => {
    try {
      const result = await loadLiveBriefingData();
      if (requestId !== dataRequestId.current) return;
      setLiveData(result);
      setDataError(null);
    } catch (error) {
      if (requestId !== dataRequestId.current) return;
      const message =
        error instanceof Error ? error.message : "Couldn't load briefing data";
      setDataError(message);
    } finally {
      if (requestId === dataRequestId.current) {
        setDataLoading(false);
      }
    }
  }, []);

  const runLiveNarrationFetch = useCallback(async (requestId: number) => {
    try {
      const result = await loadLiveNarrationData();
      if (requestId !== narrationRequestId.current) return;
      setNarration(result);
      setNarrationError(null);
    } catch (error) {
      if (requestId !== narrationRequestId.current) return;
      const message =
        error instanceof Error ? error.message : "Couldn't load narration";
      setNarrationError(message);
    } finally {
      if (requestId === narrationRequestId.current) {
        setNarrationLoading(false);
      }
    }
  }, []);

  const fetchLiveData = useCallback(() => {
    const requestId = ++dataRequestId.current;
    setDataLoading(true);
    setDataError(null);
    void runLiveDataFetch(requestId);
  }, [runLiveDataFetch]);

  const fetchLiveNarration = useCallback(() => {
    const requestId = ++narrationRequestId.current;
    setNarrationLoading(true);
    setNarrationError(null);
    void runLiveNarrationFetch(requestId);
  }, [runLiveNarrationFetch]);

  const handleRefresh = useCallback(() => {
    fetchLiveData();
    fetchLiveNarration();
  }, [fetchLiveData, fetchLiveNarration]);

  const handlePush = useCallback(async () => {
    setPushState("loading");
    setPushErrorMessage(null);

    try {
      const response = await fetch("/briefing/push", { method: "POST" });
      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as PushBriefingError | null;
        const message =
          (body?.errorType && PUSH_ERROR_MESSAGES[body.errorType]) ??
          `Failed to send briefing (${response.status})`;
        setPushErrorMessage(message);
        setPushState("error");
        return;
      }
      (await response.json()) as PushBriefingResult;
      setPushState("success");
    } catch {
      setPushErrorMessage(PUSH_ERROR_MESSAGES.transient);
      setPushState("error");
    }
  }, []);

  useEffect(() => {
    const dataId = ++dataRequestId.current;
    const narrationId = ++narrationRequestId.current;
    void runLiveDataFetch(dataId);
    void runLiveNarrationFetch(narrationId);
  }, [runLiveDataFetch, runLiveNarrationFetch]);

  const refreshing = dataLoading || narrationLoading;

  return (
    <Card className={briefingCardClassName}>
      <CardHeader className="gap-2 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="font-serif text-3xl font-medium leading-tight text-accent-peach">
              Briefing
            </CardTitle>
            <CardDescription className="font-sans text-sm">
              Today&apos;s priorities
              {narration?.generatedAt
                ? ` · narration generated ${new Date(narration.generatedAt).toLocaleString()}`
                : null}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handlePush()}
              disabled={pushState === "loading"}
            >
              {pushState === "loading" ? (
                <>
                  <span
                    className="inline-block size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
                    aria-hidden="true"
                  />
                  Sending…
                </>
              ) : (
                "Send to Telegram"
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <>
                  <span
                    className="inline-block size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
                    aria-hidden="true"
                  />
                  Refreshing…
                </>
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        </div>
        {pushState === "success" ? (
          <p className="font-sans text-xs text-muted-foreground">
            Sent to Telegram
          </p>
        ) : pushState === "error" && pushErrorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t send to Telegram</AlertTitle>
            <AlertDescription>{pushErrorMessage}</AlertDescription>
          </Alert>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6 pt-2">
        <div className="space-y-2">
          {narrationLoading ? (
            <LoadingSpinner label="Loading narration…" />
          ) : narrationError ? (
            <Alert variant="destructive">
              <AlertTitle>Narration unavailable</AlertTitle>
              <AlertDescription>{narrationError}</AlertDescription>
            </Alert>
          ) : (
            <>
              {narration?.narration ? (
                <p className="whitespace-pre-line font-serif text-xl leading-relaxed text-foreground">
                  {narration.narration}
                </p>
              ) : (
                <p className="font-serif text-lg text-muted-foreground">
                  No narration available yet.
                </p>
              )}
              {narration?.degraded ? (
                <p className="font-sans text-xs text-muted-foreground">
                  Showing a simplified summary
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="space-y-3">
          {dataLoading ? (
            <LoadingSpinner label="Loading priorities…" />
          ) : dataError ? (
            <Alert variant="destructive">
              <AlertTitle>Priorities unavailable</AlertTitle>
              <AlertDescription>{dataError}</AlertDescription>
            </Alert>
          ) : liveData ? (
            <>
              <p className="font-sans text-sm text-muted-foreground">
                {formatFreeTime(liveData.freeTime.totalFreeMinutes)} of free time
                today
              </p>
              {liveData.priorities.length > 0 ? (
                <ol className="list-inside list-decimal space-y-2 font-sans text-sm text-foreground/90">
                  {liveData.priorities.map((priority) => (
                    <li key={`${priority.type}-${priority.id}`}>
                      <span className="font-medium">{priority.title}</span>{" "}
                      <span className="text-muted-foreground">
                        · {priority.status}
                        {priority.dueDate
                          ? ` · due ${formatDueDate(priority.dueDate)}`
                          : null}{" "}
                        · {priority.importance}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="font-sans text-sm text-muted-foreground">
                  No priorities ranked yet.
                </p>
              )}
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
