#!/bin/sh

set -eu

npm run build

rsync -lprv --delete dist/client/ nonacademic.net:/srv/latex/
rsync -lprv --delete --relative dist/server/ package.json package-lock.json nonacademic.net:latex-server/

ssh nonacademic.net ./latex-server-restart
