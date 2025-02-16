#!/bin/sh

set -eu

npm run lint
astro check

exec astro build
