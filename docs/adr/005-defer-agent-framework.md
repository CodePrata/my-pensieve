# ADR-005: Defer Agent Framework Selection (Hermes vs. OpenClaw) to Phase 7

**Status:** Accepted
**Date:** 2026-07-01

## Context

Hermes Agent and OpenClaw are both actively evolving 2026 open-source agent
frameworks. OpenClaw has grown extremely quickly but has documented security
incidents (135,000+ publicly exposed instances found by researchers). Hermes
Agent is newer, built around a self-improving "learning loop" that builds a
persistent model of the user across sessions. The user wants to use one, both
for practical automation and as a portfolio signal. The original architecture
already sequences agent integration last (Phase 7), after the rest of the
system is functional.

## Decision

Do not select or integrate either framework until **Phase 7**. When the
decision point arrives, Hermes's learning-loop design is philosophically
closer to this project's goal of reducing repeated thinking than OpenClaw's
strength in multi-channel automation — but the final choice should be made
against the state of both projects at that time, not now.

## Consequences

- Avoids building the system's foundation on immature, fast-moving external
  dependencies.
- Whichever framework is chosen, it must be deployed with deliberate
  hardening (no default-exposed ports/configs) given the documented security
  history in this space. This requirement carries forward into Phase 7
  planning, not just this note.
