#!/bin/sh

set -eu

export ASTRO_DB_REMOTE_URL='file:./latex.db'
export DATABASE_URL='file:./latex.db'

npm run lint
astro check

exec astro build --remote
