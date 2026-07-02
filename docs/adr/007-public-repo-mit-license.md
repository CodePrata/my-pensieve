# ADR-007: Public Repository, MIT License, Secrets and Personal Data Excluded

**Status:** Accepted
**Date:** 2026-07-01

## Context

The project is intended as both a functioning personal system and a public
portfolio piece (GitHub/LinkedIn), while also processing the user's real
calendar, notes, and study data.

## Decision

- The repository is **public**. Only code and documentation are committed.
- `.gitignore` excludes `.env` files, Docker volume data, and any `/data`
  directory.
- Portfolio screenshots/demos use seeded or mock data — never the user's
  real personal data.
- License: **MIT**.

## Consequences

- The repo can be safely shared and referenced publicly without exposing
  OAuth tokens, calendar contents, or personal notes.
- Requires `.env.example` (committed) and `.env` (ignored) to be kept
  properly separated from day one — added explicitly to the Phase 0
  checklist.
