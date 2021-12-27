#!/usr/bin/env bash
#
# $ npm run deploy  # upload a release from dist/index.html to s3idx
# $ npm run deploy -- -n [bucket...]  # upload dist/index.html to multiple buckets

set -e

ARGS=()
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

if [ -z "$tag" ]; then
  tag="$(git tag --points-at HEAD)"
fi

args=(--content-type="text/html; charset=utf-8" --acl public-read)

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

if [ $# -gt 0 ]; then
  for bucket in "$@"; do
    if [ -z "$tag" ]; then
      src=dist/index.html
    else
      src="s3://s3idx/$tag/index.html"
    fi
    run aws s3 cp "$src" s3://$bucket/index.html "${args[@]}" "${cache_args[@]}"
  done
else
  bucket=s3idx
  # Always disable caching on the top-level index.html
  run aws s3 cp dist/index.html s3://$bucket/index.html "${args[@]}" --cache-control max-age=0,public
  # Enable caching on specific release tags (unless -C|--no-cache was passed explicitly)
  run aws s3 cp dist/index.html s3://$bucket/$tag/index.html "${args[@]}" "${cache_args[@]}"
fi
