# ADR-001: Modular Monolith over Microservices

**Status:** Accepted
**Date:** 2026-07-01

## Context

The originally planned folder structure (`services/calendar`, `services/moodle`,
`services/study`, etc.) implied a microservice-style split. Everything else in
the architecture — a single backend, a single Postgres database, a single AI
orchestrator — implied a modular monolith instead. This ambiguity needed
resolving before module boundaries, imports, or deployment could be designed.

## Decision

My Pensieve is built as a **modular monolith**: a single NestJS backend
application, with each domain area (calendar, study, projects, knowledge,
briefing, capture) implemented as its own NestJS module with enforced internal
boundaries. Modules communicate via in-process service calls, not HTTP or
message queues.

## Consequences

- Simpler deployment (one backend process) and simpler local dev (one
  `docker compose up`) — appropriate for a single-user personal system.
- Modules cannot be scaled or deployed independently. If a specific module
  (e.g. the Capture Bot listener, see ADR-009) later needs its own deploy
  lifecycle, it can be extracted at that time.
- The `services/` folder naming is retained as a module-organization
  convention within the single backend app, not as a signal of separate
  deployables.
