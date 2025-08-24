# 実行コマンド
# ./scripts/e2e_photo.sh sample.jpeg

#!/usr/bin/env bash
set -euo pipefail

API_BASE="http://localhost:3000/api"
PROJECT_ID="2"

# コマンドライン引数からファイル名を取得
if [ $# -eq 0 ]; then
    echo "使用方法: $0 <ファイル名> [PROJECT_ID]"
    echo "例: $0 test.jpg"
    echo "例: PROJECT_ID=3 $0 test.jpg"
    exit 1
fi

FILE="$1"
PROJECT_ID="${PROJECT_ID:-2}"

# ファイルの存在確認
if [ ! -f "$FILE" ]; then
    echo "エラー: ファイル '$FILE' が見つかりません"
    exit 1
fi

if ! command -v jq >/dev/null; then echo "jqが必要です"; exit 1; fi
IDEM="e2e-$(date +%s)-$RANDOM"

# ファイルサイズを取得
FILE_SIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null || echo "0")

echo "ファイル: $FILE"
echo "ファイルサイズ: $FILE_SIZE bytes"
echo "プロジェクトID: $PROJECT_ID"
echo "1) presign..."
PRESIGN=$(curl -s -X POST "$API_BASE/photos/presign" \
  -H 'Content-Type: application/json' \
  -H "X-Idempotency-Key: $IDEM-presign" \
  -d "$(jq -n --arg fn "$(basename "$FILE")" \
             --arg ct "image/jpeg" \
             --argjson bs $FILE_SIZE \
             --argjson pid $PROJECT_ID \
             '{fileName:$fn,contentType:$ct,byteSize:$bs,scope:"project",projectId:$pid}')" )

# presignレスポンスのデバッグ
echo "Presign response:"
echo "$PRESIGN" | jq .

URL=$(echo "$PRESIGN" | jq -r '.data.url')
KEY=$(echo "$PRESIGN" | jq -r '.data.key')
CT=$(echo "$PRESIGN"  | jq -r '.data.headers["Content-Type"]')

# URLとヘッダーの確認
echo "URL: $URL"
echo "Content-Type: $CT"
echo "   -> url obtained: ${URL:+ok}"

echo "2) PUT to S3..."
# より詳細なcurlオプションでデバッグ
HTTP_CODE=$(curl -v -X PUT "$URL" \
  -H "Content-Type: $CT" \
  --upload-file "$FILE" \
  -o /dev/null \
  -w "%{http_code}\n" 2>&1 | tail -1)

echo "HTTP Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" = "000" ]; then
    echo "エラー: S3へのアップロードに失敗しました"
    echo "考えられる原因:"
    echo "  - プリサインドURLが期限切れ"
    echo "  - ネットワーク接続の問題"
    echo "  - S3の設定問題"
    exit 1
fi

echo "3) attach..."
ATTACH=$(curl -s -X POST "$API_BASE/photos/attach" \
  -H 'Content-Type: application/json' \
  -H "X-Idempotency-Key: $IDEM-attach" \
  -d "$(jq -n --arg key "$KEY" --argjson pid $PROJECT_ID \
             '{projectId:$pid, kind:"before", blobKey:$key}')" )
echo "$ATTACH" | jq .
echo "✅ done"
