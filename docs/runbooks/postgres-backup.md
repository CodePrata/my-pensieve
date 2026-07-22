# Postgres Backup / Restore Runbook

This is a **manual-only** process for v1, per [ADR-016](../adr/016-postgres-backup.md) —
no automated/scheduled backups exist yet. Revisit once the system holds data
the user would be genuinely upset to lose.

Container name: `my-pensieve-postgres` (service `postgres`)
Volume name: `pensieve_pgdata`
Compose file: `docker/docker-compose.yml`

## Backup

Run from the repo root, with the stack up (`docker compose -f docker/docker-compose.yml up -d`):

```bash
docker exec my-pensieve-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c \
  > "backup-$(date +%Y%m%d-%H%M%S).dump"
```

- `$POSTGRES_USER` / `$POSTGRES_DB` come from `docker/.env` (same values passed to the container).
- `-F c` produces pg_restore's custom compressed format.
- Store the resulting `.dump` file **outside the repo tree**, or under `/data` at
  the repo root (already excluded via `.gitignore` per ADR-007) — never commit it.

## Restore

```bash
docker exec -i my-pensieve-postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists < backup-YYYYMMDD-HHMMSS.dump
```

- `--clean --if-exists` drops existing objects before recreating them, so this
  is destructive to whatever is currently in the `pensieve_pgdata` volume — confirm
  the target database before running it.
