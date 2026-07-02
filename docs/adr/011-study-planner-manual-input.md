# ADR-011: Study Planner Uses Manual Input, Not Automated Syllabus Ingestion

**Status:** Accepted
**Date:** 2026-07-01

## Context

Automated syllabus/source ingestion (Moodle scraping, PDF parsing) was left
undefined in the original plan and adds real integration complexity for
uncertain benefit.

## Decision

Study topics, syllabus structure, and deadlines are entered **manually** by
the user for v1.

## Consequences

- Removes Moodle as a required integration dependency for the Study Planner
  to function at all.
- Automated syllabus ingestion can be reconsidered later if manual entry
  proves to be a real friction point in practice.
