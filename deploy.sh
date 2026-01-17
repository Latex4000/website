#!/bin/sh

set -eu

export CORPORATE_URL=https://corp.nonacademic.net

./build.sh

rm -rf public/emoji

rsync -lrv --delete dist/client/ nonacademic.net:/srv/nonacademic/www/
rsync -lrv --delete --relative db/migration/ db/migrate.mjs db/cron.mjs dist/server/ mise.toml package.json package-lock.json nonacademic.net:/opt/nonacademic/server/

ssh nonacademic.net 'rsync -lrv --delete /opt/nonacademic/emoji/ /srv/nonacademic/www/emoji/'
ssh nonacademic.net /opt/nonacademic/server-restart
