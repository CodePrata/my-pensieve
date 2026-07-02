# ADR-010: Graceful Degradation for Briefing Generation

**Status:** Accepted
**Date:** 2026-07-01

## Context

Calendar API calls (or any external dependency) can fail, rate-limit, or hit
an expired token at any time. Nothing defined what should happen in that
case.

## Decision

Briefing generation must **never hard-crash** on a failed or partial external
data fetch. It displays whatever data is available, with a clear warning
indicating which section is stale or missing, rather than blocking the
entire briefing.

## Consequences

- Slightly more error-handling code in the briefing generator up front.
- A materially better experience for a system meant to require zero
  prompting — a broken dependency shouldn't mean no briefing at all.
