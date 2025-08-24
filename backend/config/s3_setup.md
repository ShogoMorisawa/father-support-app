# S3 設定手順

## 1. 環境変数の設定

`.env` ファイルに以下を追加してください：

```bash
# S3設定
S3_BUCKET=your-photo-bucket-name
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# オプション設定
S3_PRESIGN_EXPIRES=300
PHOTO_MAX_BYTES=10485760  # 10MB

# MinIO等の互換エンドポイント（本番AWS使用時は不要）
# S3_ENDPOINT=http://localhost:9000
# S3_FORCE_PATH_STYLE=true
```

## 2. S3 バケットの CORS 設定

S3 バケットの「アクセス許可 > CORS」に以下を設定してください：

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-frontend.example.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**重要**: `AllowedOrigins` は実際のフロントエンドのオリジンに置き換えてください。

## 3. バケットの暗号化設定

- バケットの「設定 > デフォルト暗号化」で「SSE-S3」を有効化
- パブリックブロックは有効のまま（アップロードは事前署名 URL で行う）

## 4. IAM ユーザーの権限

以下の権限のみ付与してください：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

## 5. 動作確認

1. フロントエンドで写真を選択
2. アップロード実行
3. ネットワークタブで S3 への PUT リクエストが成功しているか確認
4. 写真一覧に表示されるか確認

## トラブルシューティング

### CORS エラー

- S3 側の CORS 設定で `PUT` とオリジンが正しく設定されているか確認

### 403 SignatureDoesNotMatch

- `contentType` が presign 時と PUT 時で一致しているか確認
- リージョンが正しいか確認
- URL の期限が切れていないか確認

### ファイル形式エラー

- 許可されている形式（JPEG、PNG、GIF、WebP）のみ対応
- フロントエンドの `accept` 属性も確認

