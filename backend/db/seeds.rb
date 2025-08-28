# db/seeds.rb
require 'faker'

ActiveRecord::Base.logger = nil

# ---- ユーティリティ
def say(msg) puts("==> #{msg}") end
def jst_today
  Time.now.in_time_zone('Asia/Tokyo').to_date
end

# ---- DB全消し（PostgreSQL）
say "TRUNCATE ALL"
conn = ActiveRecord::Base.connection
tables = conn.tables - %w[schema_migrations ar_internal_metadata]
if conn.adapter_name =~ /PostgreSQL/i
  conn.execute "TRUNCATE #{tables.map{|t| %("#{t}") }.join(', ')} RESTART IDENTITY CASCADE"
else
  tables.each { |t| conn.execute("DELETE FROM #{t}") }
end

# ---- マスタ：材料
say "Create materials"
materials_seed = [
  { name: "障子紙（標準）", unit: "枚", threshold_qty: 15 },
  { name: "障子紙（強化）", unit: "枚", threshold_qty: 10 },
  { name: "襖紙（白）",   unit: "枚", threshold_qty: 10 },
  { name: "襖紙（柄）",   unit: "枚", threshold_qty: 10 },
  { name: "網戸ネット",   unit: "m",  threshold_qty: 20 },
  { name: "木枠材",       unit: "本", threshold_qty: 30 },
  { name: "桟",           unit: "本", threshold_qty: 30 },
  { name: "タタミ表",     unit: "枚", threshold_qty: 10 },
]
materials = materials_seed.map do |m|
  Material.create!(
    name: m[:name],
    unit: m[:unit],
    current_qty: (m[:threshold_qty] + rand(10..40)).to_f, # 余裕あり
    threshold_qty: m[:threshold_qty].to_f
  )
end

# ---- 顧客
say "Create customers"
50.times do
  Customer.create!(
    name: Faker::Name.name,
    name_kana: nil,
    phone: ["090", "080", "070"].sample + "-" + rand(1000..9999).to_s + "-" + rand(1000..9999).to_s,
    address: ["大分市", "別府市", "臼杵市", "由布市", "杵築市"].sample + Faker::Address.street_address
  )
end
customers = Customer.all.to_a

# ---- 見積：直近 ±7日の予定 + 一部は完了/取消に
say "Create estimates"
def jst_iso(dt)
  (dt.to_time.in_time_zone('Asia/Tokyo')).iso8601
end
20.times do
  scheduled = (jst_today + rand(-7..7)).to_datetime.change({ hour: [9, 11, 13, 15].sample, min: [0, 30].sample })
  c = customers.sample
  status = ["scheduled","completed","cancelled"].sample
  accepted = case status
             when "completed"
               [true, false].sample
             when "cancelled"
               false
             else
               nil
             end
  price_cents = case status
                when "completed"
                  accepted ? [12000, 30000, 58000].sample : nil
                else
                  nil
                end
  
  # accepted = true の場合はプロジェクトを作成
  project = nil
  if accepted
    project = Project.create!(
      customer: c,
      title: "#{c.name}様 #{['障子','襖','網戸'].sample} #{[2,3,4,6].sample}枚",
      status: "in_progress",
      due_on: jst_today + rand(1..14)
    )
  end
  
  Estimate.create!(
    scheduled_at: jst_iso(scheduled),
    customer_id: c.id,
    project_id: project&.id,
    customer_snapshot: {
      name: c.name,
      phone: c.phone || "090-0000-0000",
      address: c.address || "大分市"
    },
    status: status,
    accepted: accepted,
    price_cents: price_cents
  )
end

# ---- 進行中プロジェクト + タスク + 納品
say "Create in_progress projects + tasks + deliveries"
30.times do
  c = customers.sample
  due_on = jst_today + rand(0..10)
  p = Project.create!(
    customer: c,
    title: "#{c.name}様 #{['障子','襖','網戸'].sample} #{[2,3,4,6].sample}枚",
    status: "in_progress",
    due_on: due_on
  )

  # 納品（pending）
  Delivery.create!(
    project: p,
    date: due_on,
    status: "pending",
    title: "納品"
  )

  # タスク 1〜3
  rand(1..3).times do
    t = Task.create!(
      project: p,
      title: ["障子 張替", "襖 張替", "網戸 張替"].sample + " #{[1,2,3].sample}枚",
      kind: ["work", "repair", "replace"].sample,
      status: ["todo","doing"].sample,
      due_on: due_on
    )
    # 材料 1〜2行
    rand(1..2).times do
      m = materials.sample
      TaskMaterial.create!(
        task: t,
        material: m,
        material_name: m.name,
        qty_planned: [1,2,3,4].sample
      )
    end
  end
end

# ---- 完了済みプロジェクト（在庫も減算されるようサービスで完了させる）
say "Create completed projects (via service)"
10.times do
  c = customers.sample
  due_on = jst_today - rand(0..14) # 過去〜直近
  p = Project.create!(
    customer: c,
    title: "#{c.name}様 #{['障子','襖','網戸'].sample} 完了案件",
    status: "delivery_scheduled",
    due_on: due_on
  )
  # 納品（pending）
  Delivery.create!(project: p, date: due_on, status: "pending", title: "納品")

  # タスク 2〜3 を done & prepared にして材料紐付け
  2.times do
    t = Task.create!(
      project: p,
      title: ["障子 張替 2枚","襖 張替 2枚","網戸 張替 2枚"].sample,
      kind: "work",
      status: "done",
      due_on: due_on,
      prepared_at: Time.current
    )
    # 材料 1〜2行 + 実使用数
    rand(1..2).times do
      m = materials.sample
      planned = [1,2,3].sample
      TaskMaterial.create!(
        task: t,
        material: m,
        material_name: m.name,
        qty_planned: planned,
        qty_used: planned
      )
    end
  end

  # 案件完了（在庫減算・納品 delivered 化・監査ログ）
  if defined?(Projects::CompleteService)
    Projects::CompleteService.call(project_id: p.id)
  else
    # フォールバック（サービスがなければ最低限の状態変更）
    p.update!(status: "completed")
    Delivery.where(project_id: p.id, status: "pending").update_all(status: "delivered")
  end
end

# ---- 何件かのタスクは seed 時点で "完了→在庫減" にしておく
say "Complete some tasks (inventory down)"
if defined?(Tasks::CompleteService)
  Task.where(status: %w[todo doing]).limit(15).find_each do |t|
    begin
      Tasks::CompleteService.call(task_id: t.id)
    rescue => e
      # 在庫不足などは無視して続行
    end
  end
end

# ---- フロントエンドテスト用の追加タスクデータ
say "Create additional tasks for frontend testing"
customers.first(5).each do |c|
  # 各顧客に2件のプロジェクト（進行中）
  rand(1..2).times do
    due_on = jst_today + rand(1..7) # 1週間以内
    p = Project.create!(
      customer: c,
      title: "#{c.name}様 #{['障子','襖','網戸','カーテン'].sample} #{rand(1..5)}枚",
      status: "in_progress",
      due_on: due_on
    )
    
    # 各プロジェクトに2〜4件のタスク（todo/doneが半々）
    rand(2..4).times do
      status = rand < 0.5 ? "todo" : "done"
      t = Task.create!(
        project: p,
        title: ["障子 張替", "襖 張替", "網戸 張替", "カーテン 取付"].sample + " #{rand(1..5)}枚",
        kind: "work",
        status: status,
        due_on: due_on + rand(-2..2), # プロジェクト期日の前後2日
        prepared_at: status == "done" ? Time.current : nil
      )
      
      # 各タスクに1〜3件の材料
      rand(1..3).times do
        m = materials.sample
        planned = [0.5, 1.0, 1.5, 2.0, 3.0].sample
        used = status == "done" ? planned : 0  # 完了タスクは使用量、未完了タスクは0
        TaskMaterial.create!(
          task: t,
          material: m,
          material_name: m.name,
          qty_planned: planned,
          qty_used: used
        )
      end
    end
  end
end

# ---- E2Eテスト用の固定シナリオ
say "Create E2E test scenario"
e2e_customer = Customer.create!(
  name: "E2Eテスト顧客",
  phone: "090-E2E-TEST",
  address: "E2Eテスト住所"
)

# 障子紙（標準）の在庫を少なくして不足状態を作る
e2e_material = Material.find_by(name: "障子紙（標準）")
e2e_material.update!(current_qty: 5.0) # threshold_qty=15 より少ない

# 見積：障子紙（標準）を20枚必要とする（在庫不足）
e2e_estimate = Estimate.create!(
  scheduled_at: jst_iso(jst_today), # 今日の日付に変更
  customer: e2e_customer,
  status: "scheduled",
  accepted: nil
)

EstimateItem.create!(
  estimate: e2e_estimate,
  material: e2e_material,
  material_name: e2e_material.name,
  quantity: 20.0
)

# タスク：障子紙（標準）を5枚使用予定（完了で在庫がさらに減る）
e2e_project = Project.create!(
  customer: e2e_customer,
  title: "E2Eテスト案件",
  status: "in_progress",
  due_on: jst_today + 3
)

e2e_task = Task.create!(
  project: e2e_project,
  title: "E2Eテストタスク",
  kind: "work",
  status: "todo",
  due_on: jst_today + 3
)

TaskMaterial.create!(
  task: e2e_task,
  material: e2e_material,
  material_name: e2e_material.name,
  qty_planned: 5.0,
  qty_used: 0.0
)

say "E2E test scenario created:"
puts "  Customer: #{e2e_customer.name} (ID: #{e2e_customer.id})"
puts "  Material: #{e2e_material.name} (ID: #{e2e_material.id}, current: #{e2e_material.current_qty}, threshold: #{e2e_material.threshold_qty})"
puts "  Estimate: ID #{e2e_estimate.id}, needs #{e2e_material.name} 20#{e2e_material.unit}"
puts "  Task: ID #{e2e_task.id}, will use #{e2e_material.name} 5#{e2e_material.unit}"

say "Done."
puts
puts "Counts:"
puts "  Customers : #{Customer.count}"
puts "  Materials : #{Material.count}"
puts "  Projects  : #{Project.count} (completed: #{Project.where(status: 'completed').count})"
puts "  Tasks     : #{Task.count} (todo: #{Task.where(status: 'todo').count}, done: #{Task.where(status: 'done').count})"
puts "  Deliveries: #{Delivery.count} (pending: #{Delivery.where(status: 'pending').count}, delivered: #{Delivery.where(status: 'delivered').count})"
puts "  Estimates : #{Estimate.count}"
puts "  TaskMaterials: #{TaskMaterial.count}"
