#!/bin/bash
set -e

# ===== Oxcel ビルドスクリプト (Vite) =====

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

APP_NAME="oxcel"
DEV_PORT=5173
DEPLOY_DIR="../apps.tomippe.jp/oxcel"

# 共通スクリプト読み込み
source "$SCRIPT_DIR/../build-common/version.sh"
source "$SCRIPT_DIR/../build-common/ftp-upload.sh"
source "$SCRIPT_DIR/../build-common/dev-server.sh"
source "$SCRIPT_DIR/../build-common/git-commit.sh"

# ===== オプション解析 =====
COMMIT_MSG=""
NO_VERUP=false
while [ $# -gt 0 ]; do
    case "$1" in
        -cm) shift; COMMIT_MSG="$1" ;;
        -noverup) NO_VERUP=true ;;
    esac
    shift || true
done

# バージョン読み込み
VERSION=$(version_read)

# package.json のバージョンを更新
jq ".version = \"${VERSION}\"" package.json > package.json.tmp && mv package.json.tmp package.json
echo "  ✓ package.jsonのバージョンを v${VERSION} に更新しました"

echo "📊 ${APP_NAME} v${VERSION} をビルド中..."

# 開発サーバーの停止
dev_server_stop $DEV_PORT

# クリーンアップ
echo "🧹 ビルドフォルダをクリーンアップしています..."
if [ -d "build" ]; then
    rm -rf build
    echo "  ✓ buildディレクトリを削除しました"
fi

if [ -d "$DEPLOY_DIR" ]; then
    rm -rf "$DEPLOY_DIR"/*
    echo "  ✓ ${DEPLOY_DIR}/の中身を削除しました"
else
    mkdir -p "$DEPLOY_DIR"
    echo "  ✓ ${DEPLOY_DIR}/ディレクトリを作成しました"
fi

# ビルド
echo "🔨 ビルドを開始します..."
npm run build

# ビルド結果をコピー
echo "📂 ビルド結果をコピーしています..."
cp -R build/* "$DEPLOY_DIR/"

echo "✅ ビルドが完了しました！"

# FTPアップロード
ftp_upload_dir "$DEPLOY_DIR" "oxcel"

# 次回用バージョン保存
if ! $NO_VERUP; then
    echo ""
    echo "📝 次回用バージョンを更新しています..."
    version_save_next "$VERSION"
fi

# Git コミット
git_commit_build "$VERSION" "$COMMIT_MSG"

# 開発サーバーの再起動
dev_server_restart $DEV_PORT "npm run dev"

echo ""
echo "🎉 ${APP_NAME} v${VERSION} — すべて完了しました！"
