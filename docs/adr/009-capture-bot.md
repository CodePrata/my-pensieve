# ADR-009: General-Purpose, Capture-Only Telegram Capture Bot

**Status:** Accepted
**Date:** 2026-07-01

## Context

The user primarily discovers knowledge-worthy content on their phone (TikTok
and other apps), not on their PC, and wants a low-friction way to save it in
the moment. TikTok's official Data Portability API isn't accessible for this
use case (EEA/UK only, requires app review), and TikTok has post types
(photo carousels) that caption/metadata-only extraction misses entirely.

## Decision

A single Telegram bot accepts any inbound message — a link (any platform), an
image/screenshot, or plain text — and treats all of it as something to
**capture, never as a query**. An LLM classification step determines the
input type and routes it accordingly:

- Links → caption/metadata extraction (platform-specific).
- Images/screenshots → vision-based captioning via Ollama.
- Text → direct pass-through as a raw note.

Every capture is written to `raw/<source-type>/` and logged in `log.md`
(per ADR-008).

**Full media download** (video files, carousel images) is explicitly
**deferred as a separate future decision**, not included by default, due to
the account-risk/ToS tradeoffs of unofficial media-fetching methods.

The bot does **not** answer questions. Query/retrieval remains the AI
Orchestrator's responsibility (Phase 4+).

Historical TikTok saves are **out of scope** — capture starts fresh from the
point this bot goes live, no backfill.

## Consequences

- Requires the bot listener to run continuously — unlike the rest of the
  on-demand system (ADR-003), this is the first component that genuinely
  needs always-on execution. It should be scoped as a small,
  independently-restartable process rather than folded into the main
  on-demand backend.
- One bot handles both capture and eventually briefing delivery (ADR-006)
  for now; split into separate bots only if that becomes confusing in
  practice.
