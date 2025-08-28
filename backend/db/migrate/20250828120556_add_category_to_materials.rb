class AddCategoryToMaterials < ActiveRecord::Migration[8.0]
  def change
    add_column :materials, :category, :string
  end
end
