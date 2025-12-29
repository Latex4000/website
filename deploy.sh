#!/bin/sh

set -eu

export CORPORATE_URL=https://corp.nonacademic.net

./build.sh

rm -rf public/emoji

rsync -lprv --delete dist/client/ nonacademic.net:/srv/nonacademic/
rsync -lprv --delete --relative db/migration/ db/migrate.mjs db/cron.mjs dist/server/ mise.toml package.json package-lock.json nonacademic.net:/opt/nonacademic/server/

ssh nonacademic.net 'rsync -lprv --delete /opt/nonacademic/emoji/ /srv/nonacademic/emoji/'
ssh nonacademic.net /opt/nonacademic/server-restart
