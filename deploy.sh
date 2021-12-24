#!/usr/bin/env bash

set -e

ARGS=()
bucket=s3idx
cache=1
dry_run=
tag=
while (("$#")); do
  case "$1" in
  -t | --tag)
    shift
    tag="$1"
    shift
    ;;
  -b | --bucket)
    shift
    bucket="$1"
    shift
    ;;
  -C | --no-cache)
    shift
    cache=
    ;;
  -n | --dry-run)
    shift
    dry_run=1
    ;;
  -*|--*=) # unsupported flags
    echo "Error: Unsupported flag $1" >&2
    exit 1
    ;;
  *) # preserve positional arguments
    ARGS+=("$1")
    shift
    ;;
  esac
done

set -- "${ARGS[@]}"

if [ -n "$cache" ]; then
  cache_args=()
else
  cache_args=(--cache-control max-age=0,public)
fi

run() {
  if [ -n "$dry_run" ]; then
    echo "Would run: $@"
  else
    echo "Running: $@"
    "$@"
  fi
}

# Always disable caching on the top-level index.html
run aws s3 cp dist/index.html s3://$bucket/index.html --acl public-read --cache-control max-age=0,public
run aws s3 cp dist/index.html s3://$bucket/$tag/index.html --acl public-read "${cache_args[@]}"
