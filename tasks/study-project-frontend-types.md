# tasks/study-project-frontend-types.md

## Context
- Backend `StudyTopic` and `Project` Prisma models already have `importance` (`low`/`medium`/`high`, default `medium`) and `estimatedDurationMinutes` (nullable int) fields, added during the CRUD migration (see `data-model.md`).
- `StudyTopic` also has `examName`, `domain`, `deadline` (nullable date). `Project` also has `dueDate` (nullable date).
- `frontend/lib/types.ts` has not been updated since that migration — its `StudyTopic`/`Project` type definitions are missing these fields, so `StudySection`/`ProjectsSection` cannot render them even though the API already returns them.
- Affected files: `frontend/lib/types.ts`, `frontend/components/dashboard/study-section.tsx`, `frontend/components/dashboard/projects-section.tsx`.

## Scope of Work
- `frontend/lib/types.ts` — modify — add missing fields to the `StudyTopic` and `Project` interfaces (exact fields TBD by recon in Step 1; do not guess field names, read the actual Prisma schema).
- `frontend/components/dashboard/study-section.tsx` — modify — render `importance`, `estimatedDurationMinutes`, and `deadline` per item (badges/labels, following whatever display pattern the file already uses for existing fields like `status`).
- `frontend/components/dashboard/projects-section.tsx` — modify — render `importance`, `estimatedDurationMinutes`, and `dueDate` per item, same pattern.
- Non-goal: no backend changes. No new API calls. No changes to `HydratedPriority`/`LiveBriefingData` types (Briefing module is out of scope for this task).
- Non-goal: no changes to CRUD forms/inputs for creating or editing `StudyTopic`/`Project` — this task is display-only.

## Step-by-Step Implementation
1. **Recon first.** Read `backend/prisma/schema.prisma` for the exact current `StudyTopic` and `Project` model definitions (field names, types, nullability, enum values for `importance`). Read the actual current `frontend/lib/types.ts` to see what's already present vs. missing. Do not assume field names match `data-model.md` verbatim — that file is described as a "rough draft."
2. **Read the actual API response shape.** Check `backend/src/modules/study/study.service.ts` (or equivalent controller/service) and `backend/src/modules/projects/*` to confirm the exact JSON shape `GET /study/topics` and `GET /projects` return — specifically whether `importance` is a string union or backend enum type, and whether date fields (`deadline`, `dueDate`) are returned as ISO strings or `Date` objects over JSON (they will be ISO strings — confirm the TS type reflects `string`, not `Date`).
3. **Update `frontend/lib/types.ts`:** add the missing fields to the `StudyTopic` interface (likely `importance: 'low' | 'medium' | 'high'`, `estimatedDurationMinutes: number | null`, plus any other fields confirmed missing in Step 1/2) and to the `Project` interface (same `importance`, `estimatedDurationMinutes`, `dueDate: string | null` if not already present). Do not touch any other type in this file.
4. **Update `frontend/components/dashboard/study-section.tsx`:** for each rendered `StudyTopic` item, add display for `importance` (e.g. a `Badge` component if one is already used elsewhere in this file or `projects-section.tsx` for `status` — follow that exact pattern rather than introducing a new UI convention) and `estimatedDurationMinutes` (render as `"~X min"` or similar only if a value is present; omit entirely if `null` — do not render `"~null min"` or `"~undefined min"`). If `deadline` is not already displayed, add it using whatever date-formatting utility the codebase already uses (check for an existing helper before writing a new date formatter).
5. **Update `frontend/components/dashboard/projects-section.tsx`:** same treatment for `Project` — `importance`, `estimatedDurationMinutes`, `dueDate` (if not already shown).
6. **No new dependencies, env vars, or config keys.** No Prisma migration — the schema already has these fields; this task is frontend-only.

## Verification Checklist
- [ ] `frontend/lib/types.ts`'s `StudyTopic` and `Project` interfaces contain every field confirmed present on the actual Prisma models in Step 1 (no field silently dropped or renamed).
- [ ] `study-section.tsx` and `projects-section.tsx` render `importance` and `estimatedDurationMinutes` without runtime errors when `estimatedDurationMinutes` is `null` for a given item (test with at least one seeded row that has a `null` value).
- [ ] No backend files were modified; no new Prisma migration was generated (`git status` on `backend/` shows no changes).
- [ ] Frontend build succeeds with no new TypeScript errors introduced by the type changes.
```bash
cd frontend && npm run build
```
- [ ] Manual visual check: dashboard's Study and Projects sections show importance/duration/date for real seeded data without layout breakage.
- [ ] Full verification command:
```bash
cd frontend && npm run build && git status
```