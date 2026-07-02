# ADR-002: NestJS over Express

**Status:** Accepted
**Date:** 2026-07-01

## Context

The backend framework was left open ("Express.js, or NestJS if later
desired"). The project's stated philosophy requires a modular architecture
where every subsystem can evolve independently.

## Decision

Use **NestJS** as the backend framework.

## Consequences

- NestJS's module and dependency-injection system enforces the modular
  boundaries the project already requires (see ADR-001), rather than relying
  on developer discipline alone as would be the case with Express.
- Slightly steeper initial learning curve and more boilerplate than Express —
  acceptable given the project's modularity requirement and long intended
  lifespan.
