#!/bin/sh
set -e

# Ensure the data directory exists and is writable by the node user.
# Docker named volumes can mount with root ownership, which prevents
# the non-root node user from creating the SQLite database file.
DATA_DIR=$(dirname "${DATABASE_PATH:-/app/data/romm-request.db}")
mkdir -p "$DATA_DIR"
chown -R node:node "$DATA_DIR"

# Replace the build-time placeholder with the actual BASE_PATH in client files.
# The Vite build uses /__ROMM_BASE_PATH__/ as a placeholder so that a single
# Docker image can be configured at runtime for any subdirectory.
PLACEHOLDER="/__ROMM_BASE_PATH__/"
if grep -rq "$PLACEHOLDER" /app/client/dist/ 2>/dev/null; then
  # Normalize BASE_PATH: ensure leading and trailing /
  NORMALIZED_BASE_PATH="${BASE_PATH:-/}"
  case "$NORMALIZED_BASE_PATH" in
    /*) ;; # already starts with /
    *)  NORMALIZED_BASE_PATH="/$NORMALIZED_BASE_PATH" ;;
  esac
  case "$NORMALIZED_BASE_PATH" in
    */) ;; # already ends with /
    *)  NORMALIZED_BASE_PATH="$NORMALIZED_BASE_PATH/" ;;
  esac

  find /app/client/dist -type f \( -name '*.html' -o -name '*.js' \) \
    -exec sed -i "s|$PLACEHOLDER|$NORMALIZED_BASE_PATH|g" {} +

  echo "Replaced BASE_PATH placeholder with: $NORMALIZED_BASE_PATH"
fi

exec gosu node "$@"
