## 0) 型・共通ルール

- 時刻：`timestamptz`（UTCで保存）
    
- 金額/長さ：`numeric`（小数対応）、`CHECK`で 0 以上

- 列挙（enum）は **smallint**（アプリ側でマッピング）
    
- 文字検索用に **pg_trgm** 拡張（名前/住所/材料名など）
    

---

## 1) customers（顧客）

|カラム|型|制約/索引|
|---|---|---|
|id|bigint PK||
|name|varchar(120)|漢字名（任意）|
|kana|varchar(120)|**INDEX**（trigram）※検索/自動統合キー|
|phone|varchar(40)|**INDEX**（規格化して数字のみ推奨）|
|address|text||
|notes|text||
|last_activity_at|timestamptz|**INDEX**（一覧ソート用・非正規化）|
|created_at/updated_at|timestamptz||

**備考**

- **自動統合**：`kana` と `phone` が**両方完全一致**の時のみ自動統合。それ以外は提案に留める（住所相違なら自動統合しない）。
    
- 検索は `kana/name/phone/address` に trigram GIN を推奨。
    

---

## 2) projects（案件）

|カラム|型|制約/索引|
|---|---|---|
|id|bigint PK||
|customer_id|bigint FK(customers)|**INDEX**|
|title|varchar(200)|例：森澤邸 障子3・網戸2|
|overall_status|smallint|0=未着手,1=進行中,2=納品待ち,3=完了,4=キャンセル|
|scheduled_delivery_date|date|**INDEX**（案件の共通納品期限＝必須）|
|completed_at|timestamptz||
|summary_counts|jsonb|任意：{"障子":3,"網戸":2}|
|created_at/updated_at|timestamptz||

**備考**

- 納品写真は ActiveStorage で `Project` に `has_many_attached :photos`。
    
- 見積→作業化時に `scheduled_delivery_date` 必須。
    

---

## 3) project_items（案件ラインアイテム）

|カラム|型|制約/索引|
|---|---|---|
|id|bigint PK||
|project_id|bigint FK(projects)|**INDEX**|
|category|smallint|0=障子,1=網戸,2=襖|
|material_id|bigint FK(materials)|null可（自由入力対応）**INDEX**|
|material_name|varchar(200)|必須（マスター選択時はコピー）|
|quantity|integer|**CHECK quantity>=1**|
|est_length_per_unit_m|numeric(8,2)|null可|
|est_total_length_m|numeric(9,2)|null可（通常は quantity×est_length）|
|delivery_due|date|null可（未指定はProject期限を採用）|
|notes|text||
|created_at/updated_at|timestamptz||

---

## 4) tasks（工程：見積/作業/納品）

|カラム|型|制約/索引|
|---|---|---|
|id|bigint PK||
|project_id|bigint FK(projects)|**INDEX**|
|task_type|smallint|**INDEX** 0=見積,1=作業,2=納品|
|status|smallint|0=未実施,1=完了,2=契約成立,3=キャンセル|
|date|timestamptz|**INDEX**（予定時刻）|
|notes|text||
|created_at/updated_at|timestamptz||

**備考**

- **作業一覧**は `projects.scheduled_delivery_date` 昇順で取得（期限超過はJSTで判定して最上段）。
    
- **納品一覧**は `task_type=納品 AND status=未実施` を `date ASC`。
    

---

## 5) task_used_materials（作業タスクの実績使用長）

|カラム|型|制約/索引|
|---|---|---|
|id|bigint PK||
|task_id|bigint FK(tasks)|**INDEX**（作業タスクに限定）|
|material_id|bigint FK(materials)|**INDEX**|
|name_snapshot|varchar(200)|当時の名称|
|length_used_m|numeric(9,2)|**CHECK > 0**（m単位）|
|created_at/updated_at|timestamptz||

**備考**

- 作業完了時に確定→在庫減算の根拠データ。
    

---

## 6) materials（資材マスター：在庫=m）

|カラム|型|制約/索引|
|---|---|---|
|id|bigint PK||
|name|varchar(200)|**INDEX**（trigram推奨）|
|kind|smallint|0=障子,1=網戸,2=襖|
|track_inventory|boolean|襖は false|
|length_left_m|numeric(10,2)|null可（未設定=“—”表示）|
|length_per_roll_m|numeric(8,2)|null可|
|reorder_threshold_m|numeric(8,2)|null可（未設定＝警告無し）|
|standard_len_override_m|numeric(6,2)|null可（材料ごとの標準m/枚の上書き値）|
|notes|text||
|deleted_at|timestamptz|ソフト削除|
|created_at/updated_at|timestamptz||

**索引**

- `(kind, length_left_m)` 複合INDEX（在庫画面の並び最適化）
    

---

## 7) inventory_adjustments（在庫調整履歴・監査ログ）

|カラム|型|制約/索引|
|---|---|---|
|id|bigint PK||
|material_id|bigint FK(materials)|**INDEX**|
|direction|smallint|0=減算,1=加算|
|amount_m|numeric(9,2)|**CHECK > 0**|
|reason|smallint|0=作業消費,1=入荷,2=棚卸,3=誤操作修正,9=その他|
|memo|text|**NOT NULL**（必須）|
|related_task_id|bigint FK(tasks)|null可|
|created_at|timestamptz|**INDEX**|

**備考**

- 在庫を変動させる**すべての処理**で1行INSERT（Undoの根拠にも）。
    

---

## 8) suppliers / material_suppliers（仕入先）

**suppliers**

|カラム|型|説明|
|---|---|---|
|id|bigint PK||
|name|varchar(120)||
|email|varchar(200)||
|phone|varchar(40)|任意|
|created_at/updated_at|timestamptz||

**material_suppliers**

|カラム|型|説明|
|---|---|---|
|material_id|bigint FK(materials)||
|supplier_id|bigint FK(suppliers)||
|PRIMARY KEY(material_id, supplier_id)|||

---

## 9) email_templates（発注テンプレ）

|カラム|型|説明|
|---|---|---|
|id|bigint PK||
|name|varchar(80)|例：標準発注|
|subject_template|text|変数差し込み対応|
|body_template|text||
|created_at/updated_at|timestamptz||

**差し込みキー例**  
`{{material_name}} {{order_quantity}} {{length_per_roll_m}} {{company_name}} {{requester_name}} {{requester_phone}} {{ship_to_address}} {{requested_delivery_date}} {{preferred_supplier_name}}`

---

## 10) settings（アプリ設定：シングルトン）

|カラム|型|説明|
|---|---|---|
|id|smallint PK|常に 1|
|standard_len_shoji_m|numeric(6,2)|null可（未設定なら換算非表示）|
|standard_len_amido_m|numeric(6,2)|null可|
|reorder_threshold_default_m|numeric(6,2)|null可|
|company_name|varchar(120)||
|requester_name|varchar(120)||
|requester_phone|varchar(40)||
|ship_to_address|text||
|created_at/updated_at|timestamptz||

---

## 11) undo_events / undo_steps（無制限Undoの基盤）

**undo_events**

|カラム|型|説明|
|---|---|---|
|id|bigint PK||
|actor|varchar(60)|単一利用なら省略可|
|action|varchar(60)|"task_complete", "inventory_add" 等|
|target_type|varchar(40)|"Task","Material" など|
|target_id|bigint||
|payload|jsonb|before/after や関連ID群|
|status|smallint|0=done,1=reverted|
|created_at|timestamptz|**INDEX**|

**undo_steps**

|カラム|型|説明|
|---|---|---|
|id|bigint PK||
|undo_event_id|bigint FK(undo_events)|**INDEX**|
|step_order|integer|逆適用順|
|reverse_sql|text|もしくはAPI手順名|

**備考**

- 例：「作業完了」は Task更新＋UsedMaterials作成＋在庫減算＋調整履歴INSERT＋納品Task生成。  
    → Undo は **在庫加算 → UsedMaterials削除 → 納品Task削除 → Task戻す** の順。
    

---

## 12) ActiveStorage（写真）

- 既定の `active_storage_blobs / attachments` を利用。
    
- 受信後に **圧縮（例：長辺 1600px）＋EXIF回転補正** をサーバ側で実施（`image_processing`）。
    

---

# 🔁 主要トランザクション（原子的処理）

### 作業「完了」ボタン（魔法ボタン）

1. `tasks.status = 完了` に更新
    
2. `task_used_materials` を（推定→実績に）作成/更新
    
3. 資材ごとに `materials.length_left_m -= Σ length_used_m`
    
4. `inventory_adjustments` に **reason=作業消費** をINSERT
    
5. `projects.overall_status = 納品待ち`、必要なら**納品タスク自動生成**
    
6. 閾値判定 → 在庫通知フラグ返却
    
7. `customers.last_activity_at` 更新（案件経由で）
    
8. `undo_events` 追加（逆操作情報をpayloadへ）
    

※ どれか失敗で**全ロールバック**。

### 在庫「入荷（＋m）」処理

- `materials.length_left_m += 追加m`
    
- `inventory_adjustments`（reason=入荷, memo必須）INSERT
    
- UIでロール→m換算ショートカット提供
    

---

# 🔎 推奨インデックス/拡張

- `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
    
- GIN(trigram)：`customers(name,kana,address)`, `materials(name)`
    
- B-tree：
    
    - `customers(phone)`, `customers(last_activity_at DESC)`
        
    - `projects(customer_id)`, `projects(scheduled_delivery_date)`
        
    - `tasks(project_id, task_type, date)`
        
    - `materials(kind, length_left_m)`
        

---

# 🧪 バリデーション（DB側CHECKの要点）

- 量：`quantity >= 1`、`length_used_m > 0`、`amount_m > 0`
    
- 必須関係：`project_items.material_name NOT NULL`（material_id が null の時も必須）
    
- 期日：`projects.scheduled_delivery_date NOT NULL`（アプリ層で保証でもOK）
    

---

# 🚀 マイグレーション順（安全手順）

1. customers / materials / suppliers / email_templates / settings
    
2. projects（FK: customers）
    
3. project_items（FK: projects, materials）
    
4. tasks（FK: projects）
    
5. task_used_materials（FK: tasks, materials）
    
6. inventory_adjustments（FK: materials, tasks nullable）
    
7. material_suppliers（中間表）
    
8. undo_events / undo_steps
    
9. ActiveStorage（rails generator で追加）
    
10. インデックス（trgm/GIN）、CHECK制約の追加
    

---

# ✅ これで満たせること（再確認）

- 見積→作業化の**期日必須**／**作業完了の原子的処理**／**無制限Undo**
    
- 在庫は **m単位**で厳密管理、**監査ログ**で全て追跡
    
- 顧客は**カナ/漢字/電話クロス検索**、**自動統合**ルールで重複防止
    
- 納品写真は**案件に紐付け**、**一括追加**＆**圧縮/向き補正**
    
- ホームの**納品予定カード**、在庫の**不足バッジ/上位表示**もOK