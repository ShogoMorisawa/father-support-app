class CreateProjectPhotos < ActiveRecord::Migration[7.1]
  def change
    create_table :project_photos do |t|
      t.references :project, null: false, foreign_key: { on_delete: :cascade }
      # 将来のアイテム紐付け用。現状はFKを貼らず任意参照（NULL可）
      t.bigint :project_item_id, null: true

      t.string  :kind, null: false, default: "other" # before/after/other
      t.string  :key,  null: false                   # S3オブジェクトキー
      t.string  :content_type
      t.integer :byte_size

      t.timestamps
    end
    add_index :project_photos, [:project_id, :created_at]
    execute <<~SQL
      ALTER TABLE project_photos
      ADD CONSTRAINT chk_project_photos_kind
      CHECK (kind IN ('before','after','other'));
    SQL
    add_index :project_photos, :key, unique: false
  end
end
