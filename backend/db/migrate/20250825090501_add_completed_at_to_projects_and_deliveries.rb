class AddCompletedAtToProjectsAndDeliveries < ActiveRecord::Migration[8.0]
  def change
    # projectsテーブルにcompleted_atカラムを追加
    add_column :projects, :completed_at, :datetime
    add_index :projects, :completed_at
    
    # deliveriesテーブルにcompleted_atカラムを追加
    add_column :deliveries, :completed_at, :datetime
    add_index :deliveries, :completed_at
  end
end
