#!/bin/sh
set -e

# Ensure the data directory exists and is writable by the node user.
# Docker named volumes can mount with root ownership, which prevents
# the non-root node user from creating the SQLite database file.
DATA_DIR=$(dirname "${DATABASE_PATH:-/app/data/romm-request.db}")
mkdir -p "$DATA_DIR"
chown -R node:node "$DATA_DIR"

exec gosu node "$@"
