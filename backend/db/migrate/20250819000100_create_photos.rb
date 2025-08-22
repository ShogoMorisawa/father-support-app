class CreatePhotos < ActiveRecord::Migration[7.1]
  def change
    create_table :photos do |t|
      t.references :project, null: false, foreign_key: { on_delete: :cascade }
      t.bigint :project_item_id
      t.string :kind, null: false, default: "other" # before/after/other
      t.string :blob_key, null: false               # S3等のオブジェクトキー
      t.string :filename
      t.string :content_type
      t.integer :byte_size
      t.timestamps
    end
    add_index :photos, [:project_id, :created_at]
  end
end
