#!/usr/bin/env bash
# Sauvegarde horaire de la base Docmost → branche "save" du repo
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SAVE_BRANCH="save"
TIMESTAMP=$(date +%Y-%m-%d_%H)

cd "$REPO_DIR"

# Dump
docker compose exec -T db pg_dump -U docmost docmost | gzip > /tmp/docmost_save.sql.gz

# Branche save
git fetch origin "$SAVE_BRANCH" 2>/dev/null || true
git checkout "$SAVE_BRANCH" 2>/dev/null || git checkout --orphan "$SAVE_BRANCH"

mkdir -p saves
mv /tmp/docmost_save.sql.gz "saves/${TIMESTAMP}.sql.gz"

# Garder les 72 dernières sauvegardes (= 3 jours)
ls -t saves/*.sql.gz 2>/dev/null | tail -n +73 | xargs -r rm

git add saves/
git commit -m "save: ${TIMESTAMP}" || true
git push origin "$SAVE_BRANCH"

git checkout main
