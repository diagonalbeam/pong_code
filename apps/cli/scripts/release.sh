#!/bin/sh
set -eu

usage() {
    printf '用法：%s <version> <gs://bucket> [--local-only]\n' "$0" >&2
    exit 2
}

fail() {
    printf 'release: %s\n' "$1" >&2
    exit 1
}

[ "$#" -ge 2 ] && [ "$#" -le 3 ] || usage
if [ "$#" -eq 3 ]; then
    [ "$3" = "--local-only" ] || usage
fi
VERSION="$1"
GCS_BASE="${2%/}"
LOCAL_ONLY="${3:-}"

printf '%s' "$VERSION" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$' ||
    fail "版本号必须是 v0.0.0 格式，例如 v0.1.0"
case "$GCS_BASE" in
    gs://*) ;;
    *) fail "第二个参数必须是 gs://bucket" ;;
esac
if [ "$LOCAL_ONLY" != "--local-only" ]; then
    command -v gcloud >/dev/null 2>&1 || fail "未找到 gcloud CLI"
fi
command -v go >/dev/null 2>&1 || fail "未找到 Go"

SCRIPT_DIR=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
CLI_DIR=$(CDPATH= cd -P "$SCRIPT_DIR/.." && pwd)
REPO_ROOT=$(CDPATH= cd -P "$CLI_DIR/../.." && pwd)
OUTPUT_DIR="$REPO_ROOT/bin/cli-release/$VERSION"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pongcode-release.XXXXXX")"
trap 'rm -rf "$TMP_DIR"' EXIT
trap 'rm -rf "$TMP_DIR"; exit 130' INT
trap 'rm -rf "$TMP_DIR"; exit 143' TERM

PACKAGE_DIR="$TMP_DIR/packages"
mkdir -p "$PACKAGE_DIR"
VERSION_DIR="$GCS_BASE/pongcode/$VERSION"
BASE_URL="https://storage.googleapis.com/${GCS_BASE#gs://}/pongcode"

checksum() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$@"
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$@"
    else
        fail "未找到 sha256sum 或 shasum"
    fi
}

build_package() {
    goos="$1"
    goarch="$2"
    asset="pongcode_${goos}_${goarch}.tar.gz"
    printf '构建 %s\n' "$asset"
    (
        cd "$CLI_DIR"
        CGO_ENABLED=0 GOOS="$goos" GOARCH="$goarch" \
            go build -trimpath -ldflags="-s -w" -o "$TMP_DIR/pongcode" .
    )
    tar -czf "$PACKAGE_DIR/$asset" -C "$TMP_DIR" pongcode
    rm "$TMP_DIR/pongcode"
}

build_package darwin amd64
build_package darwin arm64
build_package linux amd64
build_package linux arm64

(
    cd "$PACKAGE_DIR"
    checksum -- *.tar.gz > SHA256SUMS
)
checksum -- "$PACKAGE_DIR"/*.tar.gz >/dev/null

INSTALLER="$TMP_DIR/install.sh"
sed "s|^DEFAULT_BUCKET=.*|DEFAULT_BUCKET=\"${GCS_BASE#gs://}\"|" \
    "$CLI_DIR/install.sh" > "$INSTALLER"
chmod 0755 "$INSTALLER"

mkdir -p "$OUTPUT_DIR"
cp "$PACKAGE_DIR"/*.tar.gz "$OUTPUT_DIR/"
cp "$PACKAGE_DIR/SHA256SUMS" "$OUTPUT_DIR/SHA256SUMS"
cp "$INSTALLER" "$OUTPUT_DIR/install.sh"
printf '%s\n' "$VERSION" > "$OUTPUT_DIR/latest"
printf '产物目录：%s\n' "$OUTPUT_DIR"

printf '上传 %s 产物\n' "$VERSION"
if [ "$LOCAL_ONLY" = "--local-only" ]; then
    printf '本地构建完成，已跳过上传。\n'
    printf '可手工上传 install.sh 和 latest 到：%s/pongcode/\n' "$GCS_BASE"
    exit 0
fi

for asset in "$OUTPUT_DIR"/*.tar.gz; do
    gcloud storage cp --cache-control="public,max-age=3600" \
        "$asset" "$VERSION_DIR/$(basename "$asset")"
done
gcloud storage cp --cache-control="public,max-age=3600" \
    "$OUTPUT_DIR/SHA256SUMS" "$VERSION_DIR/SHA256SUMS"

printf '上传安装脚本\n'
gcloud storage cp --cache-control="no-store,max-age=0" \
    "$OUTPUT_DIR/install.sh" "$GCS_BASE/pongcode/install.sh"

printf '切换 latest 到 %s\n' "$VERSION"
printf '%s\n' "$VERSION" > "$OUTPUT_DIR/latest"
gcloud storage cp --cache-control="no-store,max-age=0" \
    "$OUTPUT_DIR/latest" "$GCS_BASE/pongcode/latest"

printf '发布完成：%s/%s\n' "$BASE_URL" "$VERSION"
printf '安装命令：curl -fsSL %s/install.sh | sh\n' "$BASE_URL"
