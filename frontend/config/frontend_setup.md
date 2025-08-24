# フロントエンド設定手順

## 1. 環境変数の設定

`.env.local` ファイルに以下を追加してください：

```bash
# 写真表示用のベースURL
# S3バケットがパブリック読み取り可能な場合、またはCloudFront等のCDNを使用する場合
NEXT_PUBLIC_PHOTO_BASE_URL=https://your-bucket-name.s3.ap-northeast-1.amazonaws.com

# または、CloudFrontを使用する場合
# NEXT_PUBLIC_PHOTO_BASE_URL=https://your-cloudfront-domain.cloudfront.net
```

**注意**: この URL は写真の表示のみに使用され、アップロードには使用されません。アップロードは事前署名 URL で S3 に直接行います。

## 2. 写真表示の設定

### パブリック読み取り可能な S3 バケットの場合

- バケットポリシーで読み取り権限を付与
- セキュリティ上の注意: アップロードされた写真が誰でも見える状態になります

### CloudFront を使用する場合（推奨）

- S3 バケットはプライベートのまま
- CloudFront でオリジンアクセス制御（OAC）を設定
- より安全で高速な写真配信が可能

## 3. 動作確認

1. 写真アップロードが成功するか確認
2. アップロード後の写真が正しく表示されるか確認
3. 写真の削除が正常に動作するか確認

## 4. セキュリティ考慮事項

- `NEXT_PUBLIC_` プレフィックスが付いた環境変数はクライアントサイドで公開されます
- 写真の表示 URL は公開されるため、機密性の高い写真は別途アクセス制御を検討してください
- 将来的には CloudFront + Lambda@Edge でのアクセス制御も検討可能です

