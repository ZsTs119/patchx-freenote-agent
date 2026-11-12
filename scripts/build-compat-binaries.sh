#!/usr/bin/env bash
set -euo pipefail

# Rebuild a tagged source without editing its npm or connector package versions.
if [[ $# != 3 ]]; then
  printf 'Usage: bash %s <source-tag> <binary-version> <output-dir>\n' "$0" >&2
  exit 2
fi
source_tag=$1
binary_version=$2
output_dir=$(realpath -m "$3")
repo_root=$(git rev-parse --show-toplevel)
source_commit=$(git -C "$repo_root" rev-parse --verify "refs/tags/${source_tag}^{commit}")
[[ $binary_version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { printf 'Invalid binary version\n' >&2; exit 2; }
if [[ -d $output_dir ]] && [[ -n $(find "$output_dir" -mindepth 1 -maxdepth 1 -print -quit) ]]; then
  printf 'Output directory must be empty: %s\n' "$output_dir" >&2
  exit 2
fi
mkdir -p "$output_dir"
source_dir=$(mktemp -d)
trap 'rm -rf -- "$source_dir"' EXIT
git -C "$repo_root" archive "$source_commit" | tar -x -C "$source_dir"

build_date=${BUILD_DATE:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}
export GOMAXPROCS=1 GOFLAGS=-p=1 CGO_ENABLED=0
go_version=$(go version)
version_package=github.com/ZsTs119/patchxnote-agent/internal/version
ldflags="-s -w -X ${version_package}.Version=${binary_version} -X ${version_package}.Commit=${source_commit} -X ${version_package}.Date=${build_date}"
cd "$source_dir"
for target in darwin/amd64 darwin/arm64 linux/amd64 linux/arm64 windows/amd64 windows/arm64; do
  target_os=${target%/*}
  target_arch=${target#*/}
  suffix=
  [[ $target_os != windows ]] || suffix=.exe
  asset="patchxnote_${binary_version}_${target_os}_${target_arch}${suffix}"
  printf 'Building %s\n' "$asset"
  GOOS=$target_os GOARCH=$target_arch go build -trimpath -buildvcs=false -ldflags "$ldflags" -o "$output_dir/$asset" ./cmd/patchxnote
done
cd "$output_dir"
sha256sum patchxnote_* > checksums.txt
python3 - "$source_tag" "$source_commit" "$binary_version" "$build_date" "$go_version" <<'PY'
import json, pathlib, sys
keys = ("source_tag", "source_commit", "binary_version", "build_date", "go_version")
manifest = dict(zip(keys, sys.argv[1:]))
manifest["assets"] = sorted(p.name for p in pathlib.Path('.').glob('patchxnote_*'))
pathlib.Path('build-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
PY
printf 'Built six binaries in %s\n' "$output_dir"
