# ADR-004: Defer Vector Database (Qdrant)

**Status:** Accepted
**Date:** 2026-07-01

## Context

Qdrant was part of the originally planned stack, but no ingestion pipeline or
embedded content exists yet to search over. Standing it up now adds
operational weight for zero present benefit.

## Decision

Do not introduce Qdrant until **Phase 4 (Knowledge Base)** has real content
that requires semantic search. Use Postgres full-text search as a placeholder
for any interim retrieval needs.

## Consequences

- One fewer moving part to run and maintain during Phases 0–3.
- Semantic/similarity search is unavailable until Qdrant is introduced;
  full-text search is a reasonable stand-in for early, low-volume content.
