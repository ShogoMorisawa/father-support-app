# 1) 最小構成（まずはこれでOK）

- **フロント（Next.js）**
    
    - Amplify Hosting（最速・CD/CI付き） or S3+CloudFront（静的エクスポート時）。
        
    - ドメインは**Route 53**、証明書は**ACM**（東京リージョン ap-northeast-1）。
        
- **API（Rails）**
    
    - **App Runner**（ECSより簡単・自動スケール）。ECR にDockerイメージをpush。
        
    - VPC接続（VPC Connector）で下のRDSへ私設ネットワーク接続。
        
- **DB**
    
    - **Amazon RDS for PostgreSQL（Multi‑AZ）**。拡張`pg_trgm`を有効化。
        
    - 自動バックアップ＋**PITR**（ポイントインタイムリカバリ）ON。
        
- **ストレージ（写真・添付）**
    
    - **S3**（バケット暗号化SSE‑S3/KMS）。
        
    - 事前署名URLで**直アップロード**（APIはメタ登録だけ）。
        
    - 配信が必要なら CloudFront + OAC（オリジンアクセス制御）※後述。
        
- **メール送信**
    
    - **SES**（ドメイン認証、SPF/DKIM設定）。最初はサンドボックス解除申請を想定。
        
- **監視・ログ**
    
    - **CloudWatch Logs**（Rails/App Runnerのstdout）、メトリクス/アラーム。
        
    - **AWS Budgets**で請求アラート。
        
    - 追加でSaaSのSentry併用は◎。
        
- **シークレット**
    
    - **SSM Parameter Store（SecureString）**または**Secrets Manager**にDBパス等。
        
    - **IAMロール**でAPIから参照（環境変数に直書き禁止）。
        

---

# 2) 伸ばし方（将来の選択肢）

- **App Runner vs ECS/Fargate vs Lambda**
    
    - _まずは_ **App Runner**：Zero‑to‑oneが最短、オートスケールとHTTPS終端込み。
        
    - スケジュール処理や細かいネットワーク制御が増えたら **ECS/Fargate**。
        
    - コスト最小/スケールゼロ重視なら **API Gateway + Lambda（Ruby/Adapter）**も候補（ただしRailsは少しチューニング要）。
        
- **画像配信の最適化**
    
    - 閲覧頻度が上がったら **CloudFront** をS3の前に。OACで**S3直アクセス禁止**。
        
    - サムネ生成は**S3→Lambda（トリガ）**または後段の**CloudFront Functions/Lambda@Edge**でオンデマンド生成（v2以降でOK）。
        
- **RDSの拡張**
    
    - 需要増に合わせ **Aurora PostgreSQL** へ（自動ストレージ・リードレプリカ）。
        
    - **RDS Proxy**で接続プーリング（App Runner/ECSのスパイク抑制）。
        
- **ジョブ/バッチ**
    
    - ActiveJobのアダプタを **SQS** に。実行は **ECS Fargate Scheduled Tasks** か **EventBridge + Lambda**。
        
- **認証の将来**
    
    - 家族/従業員での多ユーザー化時に **Cognito** を採用（今はアプリロックのみでOK）。
        

---

# 3) 事故を未然に防ぐ“先回りポイント”

## ネットワーク・セキュリティ

- **RDSは非公開サブネット**、**App RunnerはVPCコネクタ経由**で到達。RDSに**パブリックIPを付けない**。
    
- **セキュリティグループ**最小化：App Runner(ENI) → RDSの5432のみ、S3は**VPCエンドポイント**を使うとNAT代を節約。
    
- **KMS鍵**：S3/RDS/ParameterStoreをKMSで暗号化（自動ローテ）。
    

## SES（メール）あるある

- サンドボックス解除申請を**先に**（用途/送信量/迷惑対策の説明を書く）。
    
- SPF/DKIM/DMARCを**Route 53**で設定。**エラー/バウンス**は **SNS通知**→ログへ。
    

## スケールとコスト

- **Graviton（arm64）**でApp Runner/ECSを動かすとコスパ◎（Dockerはarm64でビルド）。
    
- App Runnerは**最小台数/CPU/メモリ**を小さく始めて、**同時処理数でオートスケール**設定。
    
- **NAT Gatewayは高い**：S3/SES等は**Interface/ゲートウェイ型VPCエンドポイント**でインターネット経由を削減。
    
- **CloudWatch Logs保持期間**を明示（例：90日）。デフォ無限は請求が膨らみがち。
    

## DB運用

- **PITR + 自動バックアップ窓**を**業務時間外**に。
    
- Parameter Groupで `timezone=UTC`、`pg_trgm` を**各DBでCREATE EXTENSION**。
    
- **Performance Insights** 有効化、**自動メンテナンス**の適用曜日/時刻を決める。
    
- 本番は**Multi‑AZ**。リードレプリカは後からでもOK。
    
- **接続上限**と**プール設定**（Railsの`pool`）をRDSサイズに合わせる。
    

## S3（直アップロード）

- バケットポリシーは**最小権限**。事前署名は**Content‑Type/最大サイズ/有効期限**を制限。
    
- **CORS**を明示（PUT/GET、ヘッダー列挙）。
    
- **ライフサイクル**：`/original/*` → 90日で IA、365日で Glacier。
    
- データ整合性：アップロード後は**APIでメタ登録**（2段階）して“ゴミ”を減らす。
    

## アプリ基盤

- **Idempotency-Key**はALB/App Runnerが**そのままヘッダ通過**するのでOK。
    
- **ヘルスチェック**（/healthz）を置いて、App Runner/ALBの再起動時に安定可。
    
- **CloudTrail & IAM Access Analyzer**で権限の可視化をON。
    
- **タグ付け**（`Project=FatherApp`, `Env=Prod`…）→ コスト可視化と自動棚卸に必須。
    

---

# 4) 環境ごとの分離（最低限の決め）

- **アカウント分離**が理想（Dev/Stg/Prod）。難しければ**1アカウント内でVPC/Prefix/タグで厳格分離**。
    
- Route 53は**サブドメイン**で段階的に（`dev.example.com` → `app.example.com`）。
    
- CIは **GitHub Actions → ECR push → App Runner デプロイ**（ブランチごとにサービス分け）。
    

---

# 5) “今決めると後が楽”チェックリスト

-  **リージョン**：ap‑northeast‑1（東京）で統一（データ所在の明確化）。
    
-  **App Runner or ECS**：まずは App Runner。ECRは**arm64**でビルド。
    
-  **RDS**：PostgreSQL 15/16、**Multi‑AZ + PITR**、Parameter Group作成。
    
-  **S3**：バケット分割（`photos`, `public-assets`）。CORS/ライフサイクル/KMS鍵。
    
-  **SES**：ドメイン認証・サンドボックス解除・SNSでバウンス通知。
    
-  **Secrets**：Parameter Store（命名規約 `/father-app/prod/DB_URL` など）。
    
-  **アラーム**：RDS（CPU/ストレージ/連接数）、App Runner（5xx/遅延）、料金（Budgets）。
    
-  **CloudFront**（必要時）：OACでS3を私設化、キャッシュ制御ヘッダをAPIで発行。
    
-  **バックアップ Runbook**：RDS復旧手順とS3リストア手順を**1枚**に。
    

---

# 6) 参考の初期ポリシー断片（貼るだけで役立つやつ）

- **S3 CORS（直アップロード用）**
    
    ```json
    [
      {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["PUT","GET","HEAD"],
        "AllowedOrigins": ["https://app.example.com"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 300
      }
    ]
    ```
    
- **S3ライフサイクル（例）**
    
    ```json
    {
      "Rules": [
        {"ID":"to-ia-90","Prefix":"original/","Status":"Enabled","Transitions":[{"Days":90,"StorageClass":"STANDARD_IA"}]},
        {"ID":"to-glacier-365","Prefix":"original/","Status":"Enabled","Transitions":[{"Days":365,"StorageClass":"GLACIER"}]}
      ]
    }
    ```
    
