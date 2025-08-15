class CreateEstimatesAndAudit < ActiveRecord::Migration[7.1]
    def change
      # --- estimates（見積イベント：見積予定→確定まで） ---
      create_table :estimates do |t|
        t.references :customer, null: true, foreign_key: true, index: true
        t.references :project,  null: true, foreign_key: true, index: true
        t.datetime :scheduled_at, null: false  # JST運用（アプリ層で統一）
        t.string   :status,       null: false, default: "scheduled" # scheduled/completed/cancelled
        t.boolean  :accepted                                    # completed時に true/false
        t.integer  :price_cents                                 # 金額（cents整数）
        t.jsonb    :customer_snapshot, null: false, default: {} # {name, phone, address}
        t.timestamps
      end
      add_index :estimates, [:status, :scheduled_at]
      add_index :estimates, :project_id unless index_exists?(:estimates, :project_id)
  
      # --- estimate_items（見積アイテム：スナップショット） ---
      create_table :estimate_items do |t|
        t.references :estimate, null: false, foreign_key: true
        t.references :material, null: true,  foreign_key: true
        t.string  :material_name, null: false
        t.decimal :quantity, precision: 12, scale: 3, null: false
        t.timestamps
      end
  
      # --- audit_logs（履歴イベント／Undo逆操作を保存） ---
      create_table :audit_logs do |t|
        t.string   :action,      null: false          # e.g. "project.complete"
        t.string   :target_type, null: false          # e.g. "project"
        t.bigint   :target_id,   null: false
        t.string   :summary
        t.jsonb    :inverse,     null: false, default: {}  # {method, path, payload}
        t.string   :correlation_id
        t.string   :actor
        t.datetime :created_at,  null: false, default: -> { "CURRENT_TIMESTAMP" }
      end
      add_index :audit_logs, [:target_type, :target_id, :created_at]
  
      # --- idempotency_keys（結果リプレイ用の永続化） ---
      create_table :idempotency_keys do |t|
        t.string   :key,     null: false
        t.integer  :status,  null: false               # 保存したHTTPステータス
        t.jsonb    :response, null: false, default: {} # 保存したレスポンスボディ
        t.datetime :created_at, null: false, default: -> { "CURRENT_TIMESTAMP" }
      end
      add_index :idempotency_keys, :key, unique: true
    end
  end
  