# ADR-003: On-Demand Docker Compose Deployment, Ollama Native on Windows Host

**Status:** Accepted
**Date:** 2026-07-01

## Context

No deployment target was defined. The system runs on the user's single
Windows 11 PC with an AMD RX 7800 XT (16GB VRAM), which has native ROCm
support for its RDNA3 target (gfx1101). GPU passthrough into Docker containers
on Windows adds complexity that native ROCm on this hardware doesn't need.
There is also no current requirement for the system to run unattended
24/7 — the morning briefing can be generated on-demand when the dashboard is
opened, rather than on a fixed overnight schedule.

## Decision

- Postgres, the NestJS backend, and the Next.js frontend run in **Docker
  Compose** on the user's PC.
- **Ollama runs as a native Windows process**, not containerized, using
  native ROCm GPU acceleration. The backend calls Ollama's local HTTP
  endpoint.
- The system runs **on-demand**: briefings and dashboard data are generated
  fresh when the dashboard is opened, not on a background schedule. Cron
  scheduling is deferred until a concrete need for unattended execution
  exists (the Capture Bot listener is the first such case — see ADR-009).

## Consequences

- Avoids AMD GPU passthrough into Windows containers, the main source of
  friction in this setup.
- The briefing is not literally "ready" the instant the user wakes up unless
  the dashboard/backend is already running — acceptable for v1.
- Revisit if always-on infrastructure (e.g. a dedicated home server) is
  introduced later.
