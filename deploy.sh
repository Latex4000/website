#!/bin/sh

set -eu

./build.sh

rsync -lprv --delete dist/client/ nonacademic.net:/srv/latex/
rsync -lprv --delete --relative dist/server/ package.json package-lock.json nonacademic.net:latex-server/

ssh nonacademic.net ./latex-server-restart
