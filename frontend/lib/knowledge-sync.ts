import type { SyncRawItemsResult } from "./types";

export type KnowledgeSyncOutcome =
  | { ok: true; result: SyncRawItemsResult }
  | { ok: false };

let knowledgeSyncPromise: Promise<KnowledgeSyncOutcome> | null = null;

/**
 * Ensures POST /knowledge/sync runs at most once per page load, even when
 * React Strict Mode double-invokes effects in development.
 */
export function syncKnowledgeInboxOnce(): Promise<KnowledgeSyncOutcome> {
  if (!knowledgeSyncPromise) {
    knowledgeSyncPromise = fetch("/knowledge/sync", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) {
          return { ok: false as const };
        }
        const result = (await response.json()) as SyncRawItemsResult;
        return { ok: true as const, result };
      })
      .catch((): KnowledgeSyncOutcome => ({ ok: false }));
  }

  return knowledgeSyncPromise;
}
