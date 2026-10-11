#!/usr/bin/env bash
# ponytail: pg_dump → commit sur branche backups du même repo
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_BRANCH="backups"
DATE=$(date +%Y-%m-%d)

cd "$REPO_DIR"

# Dump de la base
docker compose exec -T db pg_dump -U docmost docmost | gzip > /tmp/docmost_backup.sql.gz

# Switch sur la branche backups (orpheline si elle n'existe pas encore)
git fetch origin "$BACKUP_BRANCH" 2>/dev/null || true
git checkout "$BACKUP_BRANCH" 2>/dev/null || git checkout --orphan "$BACKUP_BRANCH"

mkdir -p backups
mv /tmp/docmost_backup.sql.gz "backups/${DATE}.sql.gz"

# Garder seulement les 30 derniers backups
ls -t backups/*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm

git add backups/
git commit -m "backup: ${DATE}" --allow-empty-message || true
git push origin "$BACKUP_BRANCH"

# Retour sur main
git checkout main
