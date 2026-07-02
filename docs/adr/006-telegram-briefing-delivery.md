# ADR-006: Morning Briefing Delivered via Telegram Push, Not a Public Dashboard

**Status:** Accepted
**Date:** 2026-07-01

## Context

The user wants the morning briefing on their phone. Exposing the local
dashboard to the internet would require port forwarding, a reverse proxy,
TLS, and real authentication — significant infrastructure and attack surface
for a solo, personal-data-holding system, well before those concerns are
otherwise necessary.

## Decision

A **Telegram bot pushes** the generated briefing text to the user's phone.
No inbound port is opened on the home network; the dashboard remains
reachable only from the PC (or local network) for now.

## Consequences

- Phone access to the briefing is achieved with no public-facing surface.
- Full interactive dashboard access from the phone is not available under
  this decision. If wanted later, that's a distinct, deliberate
  infrastructure decision (reverse proxy + auth), not a side effect of this
  one.
