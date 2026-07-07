# ADR-017: Domain Interface Boundary for the Briefing Prioritization Engine

**Status:** Accepted
**Date:** 2026-07-07

## Context

The Briefing Generator (ADR-010) needs a prioritization engine that ranks
candidate items (Study Topics, Projects, and potentially future domains) by
urgency/importance. `StudyTopic` and `Project` are not yet implemented in
Prisma — Study/Projects logic is scoped for after the Briefing Generator —
so the engine will initially run against fixture data only.

Even once real Prisma models exist, generated Prisma types carry
database-specific concerns (nullable foreign keys, opaque `id` typing,
schema-driven field shapes) that have nothing to do with prioritization
logic. Coupling the engine's ranking rules directly to Prisma models — or
even to fixtures shaped like them — would mean every future schema change
(adding `masteryLevel` to `StudyTopic`, adding `blockers` to `Project`, etc.)
risks churning the engine and its tests, even when the actual ranking rules
haven't changed.

Free-time calculation (deriving contiguous available windows from
`CalendarEvent`) is treated as a fully separate concern from prioritization
and is not addressed by this ADR — see the Briefing Generator's design notes
for that split. This ADR concerns only the boundary between prioritization
and its data sources.

## Decision

The prioritization engine operates exclusively on plain domain interfaces
that expose only the fields the engine's rules actually need — never on
Prisma models or types shaped around a specific ORM/schema.

- A shared base interface (`PriorityCandidateBase`) carries the fields the
  core ranking rules operate on: `id`, `title`, `dueDate`, `importance`,
  `status`, `estimatedDurationMinutes`.
- Domain-specific interfaces (`StudyCandidate`, `ProjectCandidate`, and any
  future domain) extend the base interface and are free to add their own
  fields (e.g. `examName`/`masteryLevel` for Study, `milestones`/`blockers`
  for Project) without affecting each other or the engine's core logic.
- These feed a discriminated union (`PriorityCandidate = StudyCandidate |
  ProjectCandidate | ...`), letting the engine type-narrow on `type` only
  when a rule genuinely needs domain-specific data — not as the default way
  of accessing common fields.
- Each data source (Prisma today, in-memory fixtures for testing, any
  future API) owns a **mapping layer** responsible for producing these
  domain interfaces. The engine never imports Prisma types, and the mapping
  layer never leaks into the engine's ranking logic.
- The overall flow: `Data source → Mapping layer → Prioritization engine →
  Ranked BriefingPriority list`.

## Consequences

- The engine and its unit tests (built against fixtures shaped as
  `PriorityCandidate`s) remain unchanged when `StudyTopic`/`Project` land in
  Prisma — only a new mapping layer needs to be written and tested.
- Domain-specific fields (mastery level, blockers, milestones, etc.) can
  accumulate independently per domain without bloating a single canonical
  interface with optional fields most domains don't use.
- If a future domain needs materially different ranking *rules* (not just
  different data), the engine will need explicit per-type branching
  regardless of interface shape — this ADR resolves the data-shape boundary,
  not future rule complexity.
- Slight upfront overhead: every new data source requires an explicit
  mapping layer rather than passing ORM results straight through. Considered
  a worthwhile tradeoff for keeping the engine ORM-agnostic and stable.
