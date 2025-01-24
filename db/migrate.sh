#!/bin/sh

set -eu

# Validate arguments

usage() {
	printf 'Usage: \033[4m%s\033[m <database> [<start_migration>]\n' "$0" >&2
	exit 1
}

test $# -lt 1 -o $# -gt 2 && usage

database="$1"
start_migration="${2:-1}"

case "$start_migration" in
	''|*[!0-9]*)
		printf '<start_migration> must be a number\n\n' >&2
		usage
		;;
esac

if test "$start_migration" -ne 1 -a ! -w "$database"; then
	printf '<database> must be a writable file\n\n' >&2
	usage
fi

# Apply migrations

directory='db/migration'

ls "$directory" | \
sort -n | \
while IFS= read -r migration_file; do
	migration="$(printf %.3s "$migration_file")"

	test "$migration" -lt "$start_migration" && continue

	printf 'Applying %s\n' "$migration_file" >&2
	sqlite3 -- "$database" <"$directory/$migration_file"
done
