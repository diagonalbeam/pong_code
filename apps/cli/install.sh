#!/bin/sh
set -eu

DEFAULT_BUCKET="${PONGCODE_GCS_BUCKET:-}"
BASE_URL="${PONGCODE_DOWNLOAD_BASE_URL:-https://storage.googleapis.com/${DEFAULT_BUCKET}/pongcode}"
INSTALL_DIR="${PONGCODE_INSTALL_DIR:-$HOME/.local/bin}"

fail() {
    printf 'pongcode installer: %s\n' "$1" >&2
    exit 1
}

if [ -z "$DEFAULT_BUCKET" ]; then
    fail "未配置 GCS bucket，请设置 PONGCODE_GCS_BUCKET"
fi

if [ "${VERSION:-}" = "" ]; then
    VERSION="$(curl -fsSL "$BASE_URL/latest")" || fail "读取最新版本失败"
fi
VERSION="$(printf '%s' "$VERSION" | tr -d '[:space:]')"
case "$VERSION" in
    v[0-9]*.[0-9]*.[0-9]*) ;;
    *) fail "版本号无效：$VERSION" ;;
esac

OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS" in
    Darwin) OS_NAME="darwin" ;;
    Linux) OS_NAME="linux" ;;
    *) fail "暂不支持操作系统：$OS" ;;
esac
case "$ARCH" in
    x86_64 | amd64) ARCH_NAME="amd64" ;;
    arm64 | aarch64) ARCH_NAME="arm64" ;;
    *) fail "暂不支持 CPU 架构：$ARCH" ;;
esac

ASSET="pongcode_${OS_NAME}_${ARCH_NAME}.tar.gz"
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/pongcode-install.XXXXXX")"
STAGED_TARGET=

cleanup() {
    rm -rf "$TMP_DIR"
    if [ -n "$STAGED_TARGET" ]; then
        rm -f "$STAGED_TARGET"
    fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

curl -fsSL "$BASE_URL/$VERSION/$ASSET" -o "$TMP_DIR/$ASSET" ||
    fail "下载 $VERSION/$ASSET 失败"
curl -fsSL "$BASE_URL/$VERSION/SHA256SUMS" -o "$TMP_DIR/SHA256SUMS" ||
    fail "下载 $VERSION/SHA256SUMS 失败"

checksum() {
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$@"
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$@"
    else
        fail "未找到 sha256sum 或 shasum，无法校验安装包"
    fi
}

(
    cd "$TMP_DIR"
    grep "  $ASSET\$" SHA256SUMS | checksum -c -
) || fail "SHA256 校验失败：$ASSET"

tar -xzf "$TMP_DIR/$ASSET" -C "$TMP_DIR"
chmod 0755 "$TMP_DIR/pongcode"
mkdir -p "$INSTALL_DIR"
STAGED_TARGET="$INSTALL_DIR/.pongcode.$$.tmp"
cp "$TMP_DIR/pongcode" "$STAGED_TARGET"
chmod 0755 "$STAGED_TARGET"
mv -f "$STAGED_TARGET" "$INSTALL_DIR/pongcode"
STAGED_TARGET=

printf '已安装 pongcode %s 到 %s\n' "$VERSION" "$INSTALL_DIR/pongcode"
case ":$PATH:" in
    *":$INSTALL_DIR:"*) ;;
    *)
        printf '警告：%s 不在 PATH 中。请将下面命令加入 shell 配置后重新打开终端：\n' "$INSTALL_DIR"
        printf 'export PATH="%s:$PATH"\n' "$INSTALL_DIR"
        ;;
esac
