# ADR-016: Postgres Backup Approach

**Status:** Accepted
**Date:** 2026-07-01

## Context

The database will eventually hold the project's actual memory — project
sessions, study progress, captured knowledge — with no durability plan
defined.

## Decision

Postgres data lives in a **named Docker volume**. Backups are **manual**
(`pg_dump`) for now — no automated backup infrastructure in v1.

## Consequences

- Acceptable risk while the system is new and low-stakes.
- Revisit with automated/scheduled backups once the system holds data the
  user would be genuinely upset to lose.
