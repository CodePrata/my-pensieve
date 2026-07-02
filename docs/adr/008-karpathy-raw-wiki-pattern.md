# ADR-008: Adopt Karpathy's raw/wiki/log.md Pattern for the Knowledge Base

**Status:** Accepted
**Date:** 2026-07-01

## Context

The user's Obsidian vault is nearly empty. Andrej Karpathy's "LLM Wiki"
pattern — a `raw/` folder for immutable source material, a `wiki/` folder of
LLM-maintained summary/concept pages, and an append-only `log.md` — is a
proven, lightweight structure that matches this project's own principles:
local-first, markdown-based, no premature infrastructure (see ADR-004).

## Decision

The Obsidian vault adopts this structure directly:

- `raw/<source-type>/` — unprocessed captures (from the Capture Bot, see
  ADR-009, and later batch sources like GitHub/YouTube/PDF).
- `wiki/` — pages generated and maintained by the Phase 4 Knowledge Inbox
  pipeline, via the project's own NestJS service calling local Ollama — not
  a third-party agent at this stage (agent integration is deferred, see
  ADR-005).
- `log.md` — append-only record of every ingestion event.

## Consequences

- Gives the user both a human-browsable second brain in Obsidian and a
  queryable backend store (Postgres, later Qdrant per ADR-004) built from
  the same source of truth.
- Establishes the folder convention that the Capture Bot writes into
  directly.
