class HardenCoreConstraints < ActiveRecord::Migration[7.1]
    def up
      # 1) Enumの縛り（DBホワイトリスト化）
      execute <<~SQL
        ALTER TABLE projects   ADD CONSTRAINT chk_projects_status   CHECK (status IN ('in_progress','delivery_scheduled','completed'));
        ALTER TABLE tasks      ADD CONSTRAINT chk_tasks_status      CHECK (status IN ('todo','doing','done'));
        ALTER TABLE deliveries ADD CONSTRAINT chk_deliveries_status CHECK (status IN ('pending','delivered','cancelled'));
        ALTER TABLE estimates  ADD CONSTRAINT chk_estimates_status  CHECK (status IN ('scheduled','completed','cancelled'));
      SQL

      # 2) 非負制約（数量はすべて >= 0）
      execute <<~SQL
        ALTER TABLE materials       ADD CONSTRAINT chk_materials_qty_nonneg CHECK (current_qty >= 0 AND threshold_qty >= 0);
        ALTER TABLE task_materials  ADD CONSTRAINT chk_tm_qty_nonneg        CHECK ((qty_planned IS NULL OR qty_planned >= 0) AND qty_used >= 0);
        ALTER TABLE estimate_items  ADD CONSTRAINT chk_ei_qty_nonneg         CHECK (quantity >= 0);
      SQL

      # 3) 納品の重複防止（同案件・同日・同タイトルは一意）
      execute <<~SQL
        CREATE UNIQUE INDEX IF NOT EXISTS ux_deliveries_project_date_title
          ON deliveries(project_id, date, COALESCE(title,''));
      SQL

      # 4) task_materials の参照整合（material_id か material_name のどちらか必須）
      execute <<~SQL
        ALTER TABLE task_materials
        ADD CONSTRAINT chk_tm_ref CHECK (material_id IS NOT NULL OR material_name <> '');
      SQL

      # 5) 見積⇄案件の整合
      execute <<~SQL
        -- completed なら accepted が必須
        ALTER TABLE estimates
        ADD CONSTRAINT chk_est_completed_has_accepted
        CHECK (status <> 'completed' OR accepted IS NOT NULL);

        -- accepted=true → project_id 必須 & 価格 >= 0 / accepted=false → project_id は NULL
        ALTER TABLE estimates
        ADD CONSTRAINT chk_est_accept_project_price
        CHECK (
          accepted IS NULL
          OR (accepted = true  AND project_id IS NOT NULL AND (price_cents IS NOT NULL AND price_cents >= 0))
          OR (accepted = false AND project_id IS NULL)
        );
      SQL

      # project_id が付いた見積は一意（NULLは除外）
      execute <<~SQL
        CREATE UNIQUE INDEX IF NOT EXISTS ux_estimates_project
          ON estimates(project_id) WHERE project_id IS NOT NULL;
      SQL

      # 6) 低在庫クエリの高速化（部分Index）
      execute <<~SQL
        CREATE INDEX IF NOT EXISTS idx_materials_low
          ON materials (id) WHERE current_qty < threshold_qty;
      SQL

      # 7) 外部キーの on_delete を最終確認（すでに設定済みでも安全）
      if foreign_key_exists?(:tasks, :projects)
        remove_foreign_key :tasks, :projects
      end
      add_foreign_key :tasks, :projects, on_delete: :cascade

      if foreign_key_exists?(:deliveries, :projects)
        remove_foreign_key :deliveries, :projects
      end
      add_foreign_key :deliveries, :projects, on_delete: :cascade

      if foreign_key_exists?(:task_materials, :tasks)
        remove_foreign_key :task_materials, :tasks
      end
      add_foreign_key :task_materials, :tasks, on_delete: :cascade

      if foreign_key_exists?(:projects, :customers)
        remove_foreign_key :projects, :customers
      end
      add_foreign_key :projects, :customers, on_delete: :restrict
    end

    def down
      # 取り消し（必要最小限）
      execute "DROP INDEX IF EXISTS ux_deliveries_project_date_title;"
      execute "DROP INDEX IF EXISTS ux_estimates_project;"
      execute "DROP INDEX IF EXISTS idx_materials_low;"

      %w[
        chk_projects_status chk_tasks_status chk_deliveries_status chk_estimates_status
        chk_materials_qty_nonneg chk_tm_qty_nonneg chk_ei_qty_nonneg
        chk_tm_ref chk_est_completed_has_accepted chk_est_accept_project_price
      ].each do |c|
        execute "ALTER TABLE projects   DROP CONSTRAINT IF EXISTS #{c};"
        execute "ALTER TABLE tasks      DROP CONSTRAINT IF EXISTS #{c};"
        execute "ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS #{c};"
        execute "ALTER TABLE estimates  DROP CONSTRAINT IF EXISTS #{c};"
        execute "ALTER TABLE materials  DROP CONSTRAINT IF EXISTS #{c};"
        execute "ALTER TABLE task_materials DROP CONSTRAINT IF EXISTS #{c};"
        execute "ALTER TABLE estimate_items DROP CONSTRAINT IF EXISTS #{c};"
      end

      remove_foreign_key :tasks, :projects rescue nil
      remove_foreign_key :deliveries, :projects rescue nil
      remove_foreign_key :task_materials, :tasks rescue nil
      remove_foreign_key :projects, :customers rescue nil
    end
end
