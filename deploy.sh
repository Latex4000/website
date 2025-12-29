#!/bin/sh

set -eu

export CORPORATE_URL=https://corp.nonacademic.net

./build.sh

rm -rf public/emoji

rsync -lprv --delete dist/client/ nonacademic.net:/srv/latex/
rsync -lprv --delete --relative db/migration/ db/migrate.mjs db/cron.mjs dist/server/ mise.toml package.json package-lock.json nonacademic.net:latex-server/

ssh nonacademic.net 'rsync -lprv --delete latex-emoji/ /srv/latex/emoji/'
ssh nonacademic.net ./latex-server-restart
