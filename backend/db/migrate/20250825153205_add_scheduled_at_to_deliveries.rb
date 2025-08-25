class AddScheduledAtToDeliveries < ActiveRecord::Migration[8.0]
  def change
    add_column :deliveries, :scheduled_at, :datetime
    
    # インデックスを追加（時刻でのソート・検索用）
    add_index :deliveries, [:project_id, :scheduled_at]
    add_index :deliveries, [:status, :scheduled_at]
    
    # 既存のユニーク制約を更新（scheduled_atを含める）
    remove_index :deliveries, name: 'ux_deliveries_project_date_title'
    add_index :deliveries, [:project_id, :date, :scheduled_at, :title], 
              name: 'ux_deliveries_project_date_scheduled_title', 
              unique: true
  end
end
