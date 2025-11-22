#!/bin/sh

set -eu

if test -f .env; then
    . ./.env
    export DEVELOPER_DISCORD_ID
fi

database='dev/latex.db'

export ANALYTICS_FINGERPRINT_SECRET='dev'
export CORPORATE_URL=
export CRAWLER_UA_JSON='dev/crawler-user-agents.json'
export DATABASE_URL="file:./$database"
export DISCORD_FEED_WEBHOOK=
export DIGITALOCEAN_DNS_TOKEN=
export LATEX_WEB_SYSTEMD_UNIT=
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

# Download crawler-user-agents.json
if test ! -f "$CRAWLER_UA_JSON"; then
    printf 'Downloading crawler-user-agents.json\n' >&2
    curl -Ls -o "$CRAWLER_UA_JSON" 'https://raw.githubusercontent.com/monperrus/crawler-user-agents/master/crawler-user-agents.json'
fi

# Create database
node db/migrate.mjs "$database"

# Run development environment
exec astro dev
