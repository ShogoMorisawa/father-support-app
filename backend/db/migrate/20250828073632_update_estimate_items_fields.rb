class UpdateEstimateItemsFields < ActiveRecord::Migration[8.0]
  def change
    # 既存のquantityフィールドをqtyにリネーム
    rename_column :estimate_items, :quantity, :qty
    
    # 新しいフィールドを追加
    add_column :estimate_items, :category, :string
    add_column :estimate_items, :unit, :string
    add_column :estimate_items, :position, :integer, default: 0
    
    # インデックスを追加
    add_index :estimate_items, [:estimate_id, :position]
  end
end
