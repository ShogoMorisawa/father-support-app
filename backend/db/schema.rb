# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_08_15_000200) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pg_trgm"

  create_table "customers", force: :cascade do |t|
    t.string "name", limit: 100, null: false
    t.string "name_kana", limit: 100
    t.string "phone", limit: 20
    t.string "phone_normalized", limit: 20
    t.text "address"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "idx_customers_name_trgm", opclass: :gin_trgm_ops, using: :gin
    t.index ["name_kana"], name: "idx_customers_name_kana_trgm", opclass: :gin_trgm_ops, using: :gin
    t.index ["phone_normalized"], name: "index_customers_on_phone_normalized"
  end

  create_table "deliveries", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.date "date", null: false
    t.string "status", default: "pending", null: false
    t.string "title"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id", "date"], name: "index_deliveries_on_project_id_and_date"
    t.index ["project_id"], name: "index_deliveries_on_project_id"
    t.index ["title"], name: "idx_deliveries_title_trgm", opclass: :gin_trgm_ops, using: :gin
  end

  create_table "materials", force: :cascade do |t|
    t.string "name", null: false
    t.string "unit"
    t.decimal "current_qty", precision: 12, scale: 3, default: "0.0", null: false
    t.decimal "threshold_qty", precision: 12, scale: 3, default: "0.0", null: false
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_materials_on_name", unique: true
  end

  create_table "projects", force: :cascade do |t|
    t.bigint "customer_id", null: false
    t.string "title", limit: 200, null: false
    t.string "status", default: "in_progress", null: false
    t.date "due_on"
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id", "status"], name: "index_projects_on_customer_id_and_status"
    t.index ["customer_id"], name: "index_projects_on_customer_id"
  end

  create_table "task_materials", force: :cascade do |t|
    t.bigint "task_id", null: false
    t.bigint "material_id"
    t.string "material_name", null: false
    t.decimal "qty_planned", precision: 12, scale: 3
    t.decimal "qty_used", precision: 12, scale: 3, default: "0.0", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["material_id"], name: "index_task_materials_on_material_id"
    t.index ["task_id", "material_id"], name: "index_task_materials_on_task_id_and_material_id"
    t.index ["task_id"], name: "index_task_materials_on_task_id"
  end

  create_table "tasks", force: :cascade do |t|
    t.bigint "project_id", null: false
    t.string "title", limit: 200, null: false
    t.string "kind", limit: 50
    t.date "due_on"
    t.string "status", default: "todo", null: false
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["project_id", "due_on"], name: "index_tasks_on_project_id_and_due_on"
    t.index ["project_id"], name: "index_tasks_on_project_id"
  end

  add_foreign_key "deliveries", "projects", on_delete: :cascade
  add_foreign_key "projects", "customers", on_delete: :restrict
  add_foreign_key "task_materials", "materials"
  add_foreign_key "task_materials", "tasks", on_delete: :cascade
  add_foreign_key "tasks", "projects", on_delete: :cascade
end
