# CLAUDE.md

## Project
My Pensieve — personal life-OS. NestJS 11 modular monolith backend + Next.js (App Router) frontend + Postgres/Prisma. Single user, no multi-tenancy, no `User` table. Windows 11 + AMD GPU dev machine.

## Stack & Conventions
- **Backend:** NestJS 11, Prisma ORM, Postgres. Modules: Calendar, Study, Projects, Briefing, Knowledge.
- **Frontend:** Next.js App Router, TypeScript, Tailwind v4, shadcn/ui. Plain `fetch` — no SWR/React Query.
- **LLM:** Ollama native on Windows host (ROCm GPU) — `qwen2.5:7b-instruct`. **Never containerize Ollama.**
- **Vector DB:** Qdrant deferred (ADR-004). Agent framework deferred to Phase 7 (ADR-005).
- Pure calculation/formatting logic goes in small standalone files (e.g. `free-time-calculation.ts`, `format-free-time.util.ts`) — testable without mocking services.
- Domain mappers (DTO → internal type) are pure functions in `domain/mappers/`, not classes.

## Commands
```bash
# Postgres
docker compose up -d          # from repo root — Postgres ONLY, nothing else is containerized

# Backend (from backend/)
npm run start:dev             # correct dev command — `npm run dev` is BROKEN, do not use
npx jest <path>                # run specific test file
npx jest                       # full backend suite

# Frontend (from frontend/)
npm run dev                    # correct for all active development (Turbopack)
npm run build && npm run start # ONLY to simulate production — NEVER as part of the dev loop
                                # (stale .next build has caused real bugs before)

# Prisma
npx prisma studio               # run from backend/ — schema.prisma lives at backend/prisma/schema.prisma
npx prisma migrate dev --name <name>   # for schema changes
```

## Non-Negotiable Architectural Rules
- **On-demand only.** No cron, no scheduler, anywhere except the Capture Bot (ADR-003, ADR-009). Freshness is tied to the user opening the dashboard.
- **Sync-then-render pattern** for any dashboard section: `POST /x/sync` → `GET /x`. See Calendar for the reference implementation.
- **Graceful degradation, never hard-crash** (ADR-010): partial/failed external data shows a clear warning + last-known data, not a blank screen.
- **Split-by-latency endpoints** for any mixed-fast/slow data source (established pattern, Briefing): a fast always-live endpoint + a separately-cached slow endpoint, fetched independently by the frontend, no `Promise.all`.
- **LLM output is never trusted with arithmetic or formatting.** Pre-format any number/string in TypeScript before it enters an Ollama prompt. Never ask the model to convert/format values itself.
- **No new DB tables/migrations without an explicit ask.** Confirm schema changes as their own step.
- ADRs are numbered sequentially; check `docs/adr/README.md` for the next free number before creating one. **Known conflict:** ADR-018/019 are reserved for two undrafted LifeOS-derived decisions — do not assign these numbers to anything else.

## Reference Docs — Read Before Any Significant Change
- `docs/architecture.md` — system overview, component table, on-demand-sync pattern, deferred items.
- `docs/data-model.md` — entity definitions, relationships. Labeled a "rough draft" — verify against `backend/prisma/schema.prisma` for exact current field names/types before trusting it.
- `docs/adr/README.md` — index of all ADRs. **Currently out of date: only lists through ADR-016; ADR-017 (Briefing engine domain-boundary decision) exists but isn't indexed yet.**
- `docs/adr/*.md` — 17 individual ADRs (001–017), all "Accepted." Read the ones relevant to whatever module you're touching before making a decision that conflicts with one.
- **Known numbering reservation:** ADR-018 and ADR-019 are reserved for two undrafted LifeOS-derived decisions (markdown prompt-pattern storage, ripgrep vault search). Do not assign these numbers to anything else.

## Known Pitfalls (real bugs hit in this codebase)
- **All-day Google Calendar events** span midnight-to-midnight and will zero out free-time calculations unless explicitly filtered (`event.allDay === true`) before entering `computeFreeTime()`.
- **Google OAuth in Testing mode expires refresh tokens every 7 days.** A "insufficient authentication scopes" error after reconnecting can mean the token grant is stale even after re-consent — a full revoke at `myaccount.google.com/permissions` may be required, not just re-auth via `/calendar/auth`.
- **Windows `cmd.exe` mangles single-quoted JSON/multi-line strings.** Use `curl -d "{\"key\": \"value\"}"` (escaped double quotes), and for multi-paragraph `git commit` messages use multiple `-m` flags, not embedded newlines.
- **Turbopack dev-mode can serve a stale `.next` build** silently — if a change "isn't showing," confirm you're running `npm run dev`, not `build`+`start`.
- **App-level date columns use server-local midnight (GMT+8 dev)**, which can land on a different UTC calendar day than Postgres's `CURRENT_DATE` — don't query briefing snapshots with raw `CURRENT_DATE`.

## Verification Discipline
- Passing unit tests alone does not close out a task. Confirm the actual code path was exercised (not just a happy-path mock), and show real diffs/real test output — not summaries.
- Any exception to a stated "do not touch X" constraint must be called out explicitly, not silently applied.