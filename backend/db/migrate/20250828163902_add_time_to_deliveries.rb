class AddTimeToDeliveries < ActiveRecord::Migration[8.0]
  def change
    add_column :deliveries, :delivery_time, :time
  end
end
