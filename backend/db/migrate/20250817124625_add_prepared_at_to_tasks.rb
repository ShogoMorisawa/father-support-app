class AddPreparedAtToTasks < ActiveRecord::Migration[7.1]
  def change
    add_column :tasks, :prepared_at, :datetime
  end
end
