# ADR-012: Notifications Folded into Briefing Output

**Status:** Accepted
**Date:** 2026-07-01

## Context

"Notifications" appeared as a Phase 1 dashboard section with no owning
module or generating logic defined anywhere else in the architecture — an
orphaned UI box with nothing behind it.

## Decision

There is no separate Notifications module for v1. Anything
notification-worthy is surfaced as part of the **Briefing's** generated
output.

## Consequences

- One less module and schema to design and maintain.
- If a genuine need for standalone, briefing-independent notifications
  emerges later (e.g. a mid-day alert), it becomes a deliberate, scoped
  addition at that time — not a default that was already half-built.
