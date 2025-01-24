#!/bin/sh

set -eu

database='latex-development.db'

export ASTRO_DB_REMOTE_URL="file:./$database"

# Re-create database
rm -f "$database"
db/migrate.sh "$database"

# Seed database
astro db execute db/seed.ts --remote

# Run development environment
astro dev --remote
