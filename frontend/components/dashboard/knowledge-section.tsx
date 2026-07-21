"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { syncKnowledgeInboxOnce } from "@/lib/knowledge-sync";
import type { ProcessInboxResult, RawItem } from "@/lib/types";

export function KnowledgeSection() {
  const [items, setItems] = useState<RawItem[]>([]);
  const [syncing, setSyncing] = useState(true);
  const [syncFailed, setSyncFailed] = useState(false);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<ProcessInboxResult | null>(
    null,
  );
  const [processError, setProcessError] = useState<string | null>(null);

  async function fetchInbox() {
    const response = await fetch("/knowledge/inbox");
    if (!response.ok) {
      throw new Error(`Failed to load inbox (${response.status})`);
    }
    const data = (await response.json()) as RawItem[];
    setItems(data);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadKnowledgeInbox() {
      setSyncing(true);
      setSyncFailed(false);
      setInboxError(null);

      const syncOutcome = await syncKnowledgeInboxOnce();
      if (cancelled) return;

      if (!syncOutcome.ok) {
        setSyncFailed(true);
      }

      try {
        await fetchInbox();
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Failed to load inbox";
          setInboxError(message);
        }
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    }

    void loadKnowledgeInbox();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleProcessInbox() {
    setProcessing(true);
    setProcessError(null);
    setProcessResult(null);

    try {
      const response = await fetch("/knowledge/process", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Failed to process inbox (${response.status})`);
      }
      const result = (await response.json()) as ProcessInboxResult;
      setProcessResult(result);
      await fetchInbox();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process inbox";
      setProcessError(message);
    } finally {
      setProcessing(false);
    }
  }

  const unprocessedCount = items.filter((item) => !item.processed).length;

  return (
    <Card className="rounded-lg border border-border bg-card shadow-none ring-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Knowledge Inbox
          </CardTitle>
          <CardDescription className="text-xs">
            Captured items awaiting processing
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={() => void handleProcessInbox()}
          disabled={processing || syncing || unprocessedCount === 0}
        >
          {processing ? "Processing…" : "Process Inbox"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {syncing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className="inline-block size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
              aria-hidden="true"
            />
            Syncing Knowledge Inbox…
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

        {inboxError && (
          <Alert variant="destructive">
            <AlertTitle>Inbox unavailable</AlertTitle>
            <AlertDescription>{inboxError}</AlertDescription>
          </Alert>
        )}

        {processError && (
          <Alert variant="destructive">
            <AlertTitle>Processing failed</AlertTitle>
            <AlertDescription>{processError}</AlertDescription>
          </Alert>
        )}

        {processResult && processResult.failed > 0 && (
          <Alert variant="destructive">
            <AlertTitle>
              {processResult.failed} item{processResult.failed === 1 ? "" : "s"}{" "}
              failed to process
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc space-y-1 pl-4">
                {processResult.failures.map((failure) => (
                  <li key={failure.rawItemId}>{failure.reason}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {processResult && processResult.processed > 0 && (
          <Alert>
            <AlertTitle>Processed {processResult.processed} item(s)</AlertTitle>
          </Alert>
        )}

        {!syncing && !inboxError && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No captured items yet.
          </p>
        )}

        {!inboxError && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border/80 bg-background/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.rawFilePath}</p>
                  <Badge variant="outline">{item.sourceType}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Captured {new Date(item.capturedAt).toLocaleString()} via{" "}
                  {item.captureMethod.replace("_", " ")}
                  {item.processed ? " · processed" : " · pending"}
                </p>
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    className="mt-2 inline-block text-sm text-primary underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.sourceUrl}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
