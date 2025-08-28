class AddUnitToTaskMaterials < ActiveRecord::Migration[8.0]
  def change
    add_column :task_materials, :unit, :string
  end
end
