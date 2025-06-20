#!/bin/sh

set -eu

if test -f .env; then
    . ./.env
    export DEVELOPER_DISCORD_ID
fi

database='dev/latex.db'

export CORPORATE_URL=
export DATABASE_URL="file:./$database"
export DIGITALOCEAN_DNS_TOKEN=
export LATEX_WEB_SYSTEMD_UNIT=
export PUBLIC_DIRECTORY='public'
export SECRET_HMAC_KEY='dev'
export SIGHTS_RUN_AFTER_UPLOAD=
export SIGHTS_UPLOAD_DIRECTORY='dev/sights'
export SOUNDS_RUN_AFTER_UPLOAD=
export SOUNDS_UPLOAD_DIRECTORY='dev/sounds'
export TUNICWILDS_DAILY_FILE=dev/tunicwilds-daily.json
export TUNICWILDS_RENDERED_DIRECTORY=dev/tunicwilds-rendered
export TUNICWILDS_UPLOAD_DIRECTORY='dev/tunicwilds'
export TUNICWILDS_UPLOAD_URL=
export WORDS_RUN_AFTER_UPLOAD=
export WORDS_UPLOAD_DIRECTORY='dev/words'

if test $# -gt 0; then
    exec "$@"
fi

# Clean up files from last run
rm -rf \
    "$database" \
    "$SIGHTS_UPLOAD_DIRECTORY" \
    "$SOUNDS_UPLOAD_DIRECTORY" \
    "$WORDS_UPLOAD_DIRECTORY" \
    "$TUNICWILDS_DAILY_FILE" \
    "$TUNICWILDS_RENDERED_DIRECTORY" \
    "$TUNICWILDS_UPLOAD_DIRECTORY"

# Create directories
mkdir -p "$SIGHTS_UPLOAD_DIRECTORY"
mkdir -p "$SOUNDS_UPLOAD_DIRECTORY"
mkdir -p "$WORDS_UPLOAD_DIRECTORY"
mkdir -p "$TUNICWILDS_RENDERED_DIRECTORY"
mkdir -p "$TUNICWILDS_UPLOAD_DIRECTORY"

# Create database
node db/migrate.mjs "$database"

# Run development environment
exec astro dev
