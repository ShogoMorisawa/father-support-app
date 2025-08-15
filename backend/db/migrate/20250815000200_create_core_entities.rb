class CreateCoreEntities < ActiveRecord::Migration[7.1]
    def up
      # customers
      create_table :customers do |t|
        t.string  :name,       null: false, limit: 100
        t.string  :name_kana,  limit: 100
        t.string  :phone,      limit: 20
        t.string  :phone_normalized, limit: 20
        t.text    :address
        t.timestamps
      end
      add_index :customers, :phone_normalized
      execute <<~SQL
        CREATE INDEX idx_customers_name_trgm ON customers USING gin (name gin_trgm_ops);
        CREATE INDEX idx_customers_name_kana_trgm ON customers USING gin (name_kana gin_trgm_ops);
      SQL
  
      # materials（在庫）
      create_table :materials do |t|
        t.string  :name,  null: false
        t.string  :unit
        t.decimal :current_qty,   precision: 12, scale: 3, null: false, default: 0
        t.decimal :threshold_qty, precision: 12, scale: 3, null: false, default: 0
        t.integer :lock_version, null: false, default: 0  # 楽観ロック（将来の同時編集に備え）
        t.timestamps
      end
      add_index :materials, :name, unique: true
  
      # projects（案件）
      create_table :projects do |t|
        t.references :customer, null: false, foreign_key: { on_delete: :restrict }
        t.string  :title,  null: false, limit: 200
        t.string  :status, null: false, default: "in_progress"  # enumは後続PRでCHECK追加
        t.date    :due_on
        t.integer :lock_version, null: false, default: 0
        t.timestamps
      end
      add_index :projects, [:customer_id, :status]
  
      # tasks（作業）
      create_table :tasks do |t|
        t.references :project, null: false, foreign_key: { on_delete: :cascade }
        t.string  :title,  null: false, limit: 200
        t.string  :kind,   limit: 50
        t.date    :due_on
        t.string  :status, null: false, default: "todo"
        t.integer :lock_version, null: false, default: 0
        t.timestamps
      end
      add_index :tasks, [:project_id, :due_on]
  
      # task_materials（作業×資材×数量｜最良B案：実績中心）
      create_table :task_materials do |t|
        t.references :task,     null: false, foreign_key: { on_delete: :cascade }
        t.references :material, null: true,  foreign_key: true
        t.string  :material_name, null: false           # スナップショット
        t.decimal :qty_planned, precision: 12, scale: 3 # 任意
        t.decimal :qty_used,    precision: 12, scale: 3, null: false, default: 0
        t.timestamps
      end
      add_index :task_materials, [:task_id, :material_id]
  
      # deliveries（納品予定）
      create_table :deliveries do |t|
        t.references :project, null: false, foreign_key: { on_delete: :cascade }
        t.date    :date,   null: false
        t.string  :status, null: false, default: "pending"
        t.string  :title
        t.timestamps
      end
      add_index :deliveries, [:project_id, :date]
      execute <<~SQL
        CREATE INDEX idx_deliveries_title_trgm ON deliveries USING gin (title gin_trgm_ops);
      SQL
    end
  
    def down
      drop_table :deliveries
      drop_table :task_materials
      drop_table :tasks
      drop_table :projects
      drop_table :materials
      execute "DROP INDEX IF EXISTS idx_customers_name_trgm"
      execute "DROP INDEX IF EXISTS idx_customers_name_kana_trgm"
      drop_table :customers
    end
  end
  