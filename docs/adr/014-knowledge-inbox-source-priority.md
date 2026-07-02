# ADR-014: Knowledge Inbox Source Priority Order

**Status:** Accepted
**Date:** 2026-07-01

## Context

Eight external sources were originally listed with no relative priority,
despite widely varying integration difficulty and actual usage. TikTok and
YouTube are the user's actual primary knowledge sources; several other
listed sources (TikTok's bulk export, Moodle) have no clean path or were
dropped by later decisions.

## Decision

Sources are implemented in this order:

1. **Obsidian `raw/`/`wiki/` files + Capture Bot inbox** (TikTok links,
   screenshots, text via ADR-008/ADR-009) — local/batch, no live API needed.
2. **GitHub** — clean API, also feeds Project Memory.
3. **YouTube** — transcript extraction, more failure modes; secondary
   source per the user.
4. **Telegram message ingestion** beyond the Capture Bot's own inbound flow,
   if distinct from it.
5. **Browser bookmarks** and any remaining sources — deprioritized until a
   concrete need arises.

Moodle and TikTok's bulk "Download Your Data" export are **dropped from the
plan entirely**: manual study input replaces Moodle (ADR-011), and
capture-only-going-forward replaces the bulk TikTok export (ADR-009).

## Consequences

Engineering effort is spent on sources that are both easy to build and
actually used, rather than working through the original list in an
arbitrary order.
