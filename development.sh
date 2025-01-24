#!/bin/sh

set -eu

database='dev/latex.db'

export ASTRO_DB_REMOTE_URL="file:./$database"
export SECRET_HMAC_KEY='dev'
export SOUNDS_RUN_AFTER_UPLOAD=
export SOUNDS_UPLOAD_DIRECTORY='dev/sounds'
export WORDS_RUN_AFTER_UPLOAD=
export WORDS_UPLOAD_DIRECTORY='dev/words'

# Clean up files from last run
rm -rf "$database" "$SOUNDS_UPLOAD_DIRECTORY" "$WORDS_UPLOAD_DIRECTORY"

# Create directories
mkdir -p "$SOUNDS_UPLOAD_DIRECTORY"
mkdir -p "$WORDS_UPLOAD_DIRECTORY"

# Create database
db/migrate.sh "$database"

# Seed database
astro db execute db/seed.ts --remote

# Run development environment
astro dev --remote
