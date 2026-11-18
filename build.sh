#!/bin/sh

set -eu

npm run lint
npx astro check

exec npx astro build
