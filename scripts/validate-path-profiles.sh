#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "${script_dir}/.." && pwd)
validator="${script_dir}/validate-path-profiles.mjs"

cd "${repo_root}"
exec node "${validator}" "$@"
