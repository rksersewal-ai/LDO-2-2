#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# LDO-2 EDMS — PostgreSQL Backup Script
#
# Usage:
#   ./scripts/backup-db.sh                  # creates a backup
#   ./scripts/backup-db.sh --verify FILE     # verifies a backup file
#   ./scripts/backup-db.sh --restore FILE    # restores from a backup file
#
# Environment:
#   POSTGRES_HOST     (default: localhost)
#   POSTGRES_PORT     (default: 5432)
#   POSTGRES_DB       (default: edms)
#   POSTGRES_USER     (default: edms)
#   POSTGRES_PASSWORD (required)
#   BACKUP_DIR        (default: ./backups)
#   RETENTION_DAYS    (default: 30)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-edms}"
POSTGRES_USER="${POSTGRES_USER:-edms}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ─── Backup ──────────────────────────────────────────────────────────────────
do_backup() {
    info "Starting backup of '${POSTGRES_DB}'..."
    info "Host: ${POSTGRES_HOST}:${POSTGRES_PORT}"
    info "Output: ${BACKUP_FILE}"

    if [ -z "${POSTGRES_PASSWORD:-}" ]; then
        error "POSTGRES_PASSWORD must be set"
    fi

    export PGPASSWORD="${POSTGRES_PASSWORD}"

    # Create the backup with pg_dump
    pg_dump \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        --format=plain \
        --no-owner \
        --no-privileges \
        --serializable-deferrable \
        2>/dev/null | gzip > "${BACKUP_FILE}"

    if [ $? -ne 0 ]; then
        error "pg_dump failed"
    fi

    unset PGPASSWORD

    # Verify the backup is non-empty and valid gzip
    local size=$(stat -f%z "${BACKUP_FILE}" 2>/dev/null || stat -c%s "${BACKUP_FILE}" 2>/dev/null || echo "0")
    if [ "${size}" -lt 100 ]; then
        error "Backup file is suspiciously small (${size} bytes). Backup may have failed."
    fi

    # Quick integrity check
    gzip -t "${BACKUP_FILE}" 2>/dev/null || error "Backup file is corrupted (gzip test failed)"

    # Calculate checksum
    local checksum=$(sha256sum "${BACKUP_FILE}" | cut -d' ' -f1)
    echo "${checksum}" > "${BACKUP_FILE}.sha256"

    info "Backup completed successfully"
    info "  Size: $(( size / 1024 )) KB"
    info "  SHA256: ${checksum}"

    # Cleanup old backups
    do_cleanup
}

# ─── Verify ──────────────────────────────────────────────────────────────────
do_verify() {
    local file="${1:?Usage: backup-db.sh --verify FILE}"
    if [ ! -f "${file}" ]; then
        error "File not found: ${file}"
    fi

    info "Verifying backup: ${file}"

    # Check gzip integrity
    if gzip -t "${file}" 2>/dev/null; then
        info "  Gzip integrity: OK"
    else
        error "  Gzip integrity: FAILED"
    fi

    # Check SHA256 if available
    if [ -f "${file}.sha256" ]; then
        local expected=$(cat "${file}.sha256")
        local actual=$(sha256sum "${file}" | cut -d' ' -f1)
        if [ "${expected}" = "${actual}" ]; then
            info "  SHA256 checksum: OK"
        else
            error "  SHA256 checksum: MISMATCH"
        fi
    else
        warn "  No .sha256 file found — skipping checksum verification"
    fi

    # Check that the SQL contains expected structures
    local table_count=$(zcat "${file}" | grep -c "CREATE TABLE" || echo "0")
    info "  Tables found: ${table_count}"

    if [ "${table_count}" -lt 5 ]; then
        warn "  Fewer than 5 tables found — backup may be incomplete"
    else
        info "  Backup appears complete"
    fi
}

# ─── Restore ─────────────────────────────────────────────────────────────────
do_restore() {
    local file="${1:?Usage: backup-db.sh --restore FILE}"
    if [ ! -f "${file}" ]; then
        error "File not found: ${file}"
    fi

    if [ -z "${POSTGRES_PASSWORD:-}" ]; then
        error "POSTGRES_PASSWORD must be set"
    fi

    warn "This will DROP the existing database '${POSTGRES_DB}' and restore from backup."
    read -p "Are you sure? Type 'yes' to continue: " confirm
    if [ "${confirm}" != "yes" ]; then
        info "Restore cancelled."
        exit 0
    fi

    export PGPASSWORD="${POSTGRES_PASSWORD}"

    info "Restoring from: ${file}"

    # Terminate existing connections
    psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
        2>/dev/null || warn "Could not terminate existing connections"

    # Drop and recreate
    dropdb -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" --if-exists "${POSTGRES_DB}" 2>/dev/null || true
    createdb -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" "${POSTGRES_DB}"

    # Restore
    zcat "${file}" | psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" 2>&1 | tail -5

    unset PGPASSWORD

    info "Restore completed. Run migrations to ensure schema is current:"
    info "  docker-compose exec backend python manage.py migrate"
}

# ─── Cleanup ─────────────────────────────────────────────────────────────────
do_cleanup() {
    info "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
    find "${BACKUP_DIR}" -name "*.sha256" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
    info "Cleanup done"
}

# ─── Main ────────────────────────────────────────────────────────────────────
case "${1:-backup}" in
    backup)
        do_backup
        ;;
    --verify)
        do_verify "${2:?Usage: backup-db.sh --verify FILE}"
        ;;
    --restore)
        do_restore "${2:?Usage: backup-db.sh --restore FILE}"
        ;;
    --cleanup)
        do_cleanup
        ;;
    *)
        echo "Usage: $0 {backup|--verify FILE|--restore FILE|--cleanup}"
        exit 1
        ;;
esac