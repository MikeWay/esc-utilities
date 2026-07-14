#!/bin/sh
set -e

DB="${POSTGRES_DB:-mealstock}"
USER="${POSTGRES_USER:-postgres}"

# Start postgres using the official entrypoint in background
docker-entrypoint.sh postgres &
PG_PID=$!

# Forward signals to postgres so the container shuts down cleanly
trap "kill -TERM $PG_PID 2>/dev/null" TERM INT

# Wait until postgres accepts connections
until pg_isready -U "$USER" -q; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done
echo "PostgreSQL ready."

# Restore from S3 if a backup exists
if [ -n "$S3_BUCKET" ] && aws s3 ls "s3://${S3_BUCKET}/mealstock.dump" > /dev/null 2>&1; then
  echo "Restoring from S3..."
  aws s3 cp "s3://${S3_BUCKET}/mealstock.dump" /tmp/mealstock.dump
  pg_restore -U "$USER" -d "$DB" --clean --if-exists --no-owner /tmp/mealstock.dump || true
  rm -f /tmp/mealstock.dump
  echo "Restore complete."
else
  echo "No S3 backup found — starting fresh."
fi

# Write sentinel so the app container knows restore is done
psql -U "$USER" -d "$DB" -c "CREATE TABLE IF NOT EXISTS _restore_complete (id INT PRIMARY KEY DEFAULT 1, done BOOL NOT NULL DEFAULT true); INSERT INTO _restore_complete VALUES(1, true) ON CONFLICT(id) DO UPDATE SET done=true;" > /dev/null 2>&1 || true

# On-demand backup listener: fires immediately when app sends pg_notify('trigger_backup','')
if [ "$S3_BACKUP_DISABLED" != "true" ] && [ -n "$S3_BUCKET" ]; then
(
  PIPE=/tmp/pg_notify_pipe
  while true; do
    rm -f "$PIPE"
    mkfifo "$PIPE"
    # Writer: send LISTEN command then keep pipe open so psql stays connected
    ( echo "LISTEN trigger_backup;"; exec tail -f /dev/null ) > "$PIPE" &
    WRITER_PID=$!
    psql -U "$USER" -d "$DB" < "$PIPE" 2>/dev/null | while IFS= read -r line; do
      case "$line" in
        *trigger_backup*)
          echo "$(date -u +%H:%M:%S): On-demand backup triggered..."
          if pg_dump -U "$USER" -Fc "$DB" > /tmp/mealstock-od.dump 2>/dev/null; then
            aws s3 cp /tmp/mealstock-od.dump "s3://${S3_BUCKET}/mealstock.dump" --quiet
            rm -f /tmp/mealstock-od.dump
            echo "$(date -u +%H:%M:%S): On-demand backup complete."
          else
            rm -f /tmp/mealstock-od.dump
            echo "$(date -u +%H:%M:%S): On-demand backup failed."
          fi
          ;;
      esac
    done
    kill "$WRITER_PID" 2>/dev/null
    rm -f "$PIPE"
    sleep 5
  done
) &
fi

# Background backup loop every 15 minutes (skipped if S3_BACKUP_DISABLED is set)
if [ "$S3_BACKUP_DISABLED" != "true" ]; then
(
  while true; do
    sleep 900
    echo "$(date -u +%H:%M:%S): Backing up to S3..."
    if pg_dump -U "$USER" -Fc "$DB" > /tmp/mealstock.dump 2>/dev/null; then
      aws s3 cp /tmp/mealstock.dump "s3://${S3_BUCKET}/mealstock.dump" --quiet
      rm -f /tmp/mealstock.dump
      echo "$(date -u +%H:%M:%S): Backup complete."
    else
      rm -f /tmp/mealstock.dump
      echo "$(date -u +%H:%M:%S): Backup failed."
    fi
  done
) &
else
  echo "S3 backup disabled — restore-only mode."
fi

wait $PG_PID
