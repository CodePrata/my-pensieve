# ADR-015: Basic CI Added to Phase 0

**Status:** Accepted
**Date:** 2026-07-01

## Context

No CI was planned in the original roadmap. The project is intended partly as
a portfolio piece, where a working CI badge is a cheap, high-signal
addition for any outside reviewer.

## Decision

A basic GitHub Actions workflow (lint + build, for both frontend and
backend) is added as part of **Phase 0**.

## Consequences

- Minimal added setup time now.
- Meaningfully improves how the repo reads to an outside reviewer
  evaluating engineering practices.
