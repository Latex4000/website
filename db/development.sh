#!/bin/sh

set -eu

rm -f latex-development.db
db/migrate.sh latex-development.db

# TODO seed
