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

ActiveRecord::Schema[8.0].define(version: 2025_08_17_124625) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pg_trgm"

  create_table "audit_logs", force: :cascade do |t|
    t.string "action", null: false
    t.string "target_type", null: false
    t.bigint "target_id", null: false
    t.string "summary"
    t.jsonb "inverse", default: {}, null: false
    t.string "correlation_id"
    t.string "actor"
    t.datetime "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.index ["target_type", "target_id", "created_at"], name: "index_audit_logs_on_target_type_and_target_id_and_created_at"
  end

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
    t.index "project_id, date, COALESCE(title, ''::character varying)", name: "ux_deliveries_project_date_title", unique: true
    t.index ["project_id", "date"], name: "index_deliveries_on_project_id_and_date"
    t.index ["project_id"], name: "index_deliveries_on_project_id"
    t.index ["title"], name: "idx_deliveries_title_trgm", opclass: :gin_trgm_ops, using: :gin
    t.check_constraint "status::text = ANY (ARRAY['pending'::character varying, 'delivered'::character varying, 'cancelled'::character varying]::text[])", name: "chk_deliveries_status"
  end

  create_table "estimate_items", force: :cascade do |t|
    t.bigint "estimate_id", null: false
    t.bigint "material_id"
    t.string "material_name", null: false
    t.decimal "quantity", precision: 12, scale: 3, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["estimate_id"], name: "index_estimate_items_on_estimate_id"
    t.index ["material_id"], name: "index_estimate_items_on_material_id"
    t.check_constraint "quantity >= 0::numeric", name: "chk_ei_qty_nonneg"
  end

  create_table "estimates", force: :cascade do |t|
    t.bigint "customer_id"
    t.bigint "project_id"
    t.datetime "scheduled_at", null: false
    t.string "status", default: "scheduled", null: false
    t.boolean "accepted"
    t.integer "price_cents"
    t.jsonb "customer_snapshot", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["customer_id"], name: "index_estimates_on_customer_id"
    t.index ["project_id"], name: "index_estimates_on_project_id"
    t.index ["project_id"], name: "ux_estimates_project", unique: true, where: "(project_id IS NOT NULL)"
    t.index ["status", "scheduled_at"], name: "index_estimates_on_status_and_scheduled_at"
    t.check_constraint "accepted IS NULL OR accepted = true AND project_id IS NOT NULL AND price_cents IS NOT NULL AND price_cents >= 0 OR accepted = false AND project_id IS NULL", name: "chk_est_accept_project_price"
    t.check_constraint "status::text <> 'completed'::text OR accepted IS NOT NULL", name: "chk_est_completed_has_accepted"
    t.check_constraint "status::text = ANY (ARRAY['scheduled'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])", name: "chk_estimates_status"
  end

  create_table "idempotency_keys", force: :cascade do |t|
    t.string "key", null: false
    t.integer "status", null: false
    t.jsonb "response", default: {}, null: false
    t.datetime "created_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.index ["key"], name: "index_idempotency_keys_on_key", unique: true
  end

  create_table "materials", force: :cascade do |t|
    t.string "name", null: false
    t.string "unit"
    t.decimal "current_qty", precision: 12, scale: 3, default: "0.0", null: false
    t.decimal "threshold_qty", precision: 12, scale: 3, default: "0.0", null: false
    t.integer "lock_version", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["id"], name: "idx_materials_low", where: "(current_qty < threshold_qty)"
    t.index ["name"], name: "index_materials_on_name", unique: true
    t.check_constraint "current_qty >= 0::numeric AND threshold_qty >= 0::numeric", name: "chk_materials_qty_nonneg"
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
    t.check_constraint "status::text = ANY (ARRAY['in_progress'::character varying, 'delivery_scheduled'::character varying, 'completed'::character varying]::text[])", name: "chk_projects_status"
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
    t.check_constraint "(qty_planned IS NULL OR qty_planned >= 0::numeric) AND qty_used >= 0::numeric", name: "chk_tm_qty_nonneg"
    t.check_constraint "material_id IS NOT NULL OR material_name::text <> ''::text", name: "chk_tm_ref"
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
    t.datetime "prepared_at"
    t.index ["project_id", "due_on"], name: "index_tasks_on_project_id_and_due_on"
    t.index ["project_id"], name: "index_tasks_on_project_id"
    t.check_constraint "status::text = ANY (ARRAY['todo'::character varying, 'doing'::character varying, 'done'::character varying]::text[])", name: "chk_tasks_status"
  end

  add_foreign_key "deliveries", "projects", on_delete: :cascade
  add_foreign_key "estimate_items", "estimates"
  add_foreign_key "estimate_items", "materials"
  add_foreign_key "estimates", "customers"
  add_foreign_key "estimates", "projects"
  add_foreign_key "projects", "customers", on_delete: :restrict
  add_foreign_key "task_materials", "materials"
  add_foreign_key "task_materials", "tasks", on_delete: :cascade
  add_foreign_key "tasks", "projects", on_delete: :cascade
end
