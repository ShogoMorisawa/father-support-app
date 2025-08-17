class HardenTaskMaterialQtyUsed < ActiveRecord::Migration[7.1]
    def up
      # 既存NULLを0.0 に埋める
      execute "UPDATE task_materials SET qty_used = 0 WHERE qty_used IS NULL;"
      # 以後は非NULL&デフォルト0.0
      change_column :task_materials, :qty_used, :decimal, precision: 12, scale: 3, default: "0.0", null: false
    end
  
    def down
      change_column :task_materials, :qty_used, :decimal, precision: 12, scale: 3, default: nil, null: true
    end
  end
  