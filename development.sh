#!/bin/sh

set -eu

if test -f .env; then
    . ./.env
    export DEVELOPER_DISCORD_ID
fi

database='dev/latex.db'

export DATABASE_URL="file:./$database"
export SECRET_HMAC_KEY='dev'
export SIGHTS_RUN_AFTER_UPLOAD=
export SIGHTS_UPLOAD_DIRECTORY='dev/sights'
export SOUNDS_RUN_AFTER_UPLOAD=
export SOUNDS_UPLOAD_DIRECTORY='dev/sounds'
export WORDS_RUN_AFTER_UPLOAD=
export WORDS_UPLOAD_DIRECTORY='dev/words'
export PUBLIC_DIRECTORY='public'

# Clean up files from last run
rm -rf "$database" "$SIGHTS_UPLOAD_DIRECTORY" "$SOUNDS_UPLOAD_DIRECTORY" "$WORDS_UPLOAD_DIRECTORY"

# Create directories
mkdir -p "$SIGHTS_UPLOAD_DIRECTORY"
mkdir -p "$SOUNDS_UPLOAD_DIRECTORY"
mkdir -p "$WORDS_UPLOAD_DIRECTORY"

# Create database
node db/migrate.mjs "$database"

# Run development environment
exec astro dev
