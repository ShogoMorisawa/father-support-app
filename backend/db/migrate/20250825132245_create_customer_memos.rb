class CreateCustomerMemos < ActiveRecord::Migration[8.0]
  def change
    create_table :customer_memos do |t|
      t.references :customer, null: false, foreign_key: true
      t.text :body, null: false
      t.timestamps
    end
    add_index :customer_memos, [:customer_id, :created_at]
  end
end
