class AllowNullQtyUsedInTaskMaterials < ActiveRecord::Migration[8.0]
  def change
    change_column :task_materials, :qty_used, :decimal, precision: 12, scale: 3, null: true
  end
end
