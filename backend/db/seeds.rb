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

# ---- マスタ：材料（在庫管理の基本）
say "Create materials"
materials_seed = [
  { name: "障子紙（標準）", unit: "枚", threshold_qty: 15.0, current_qty: 25.0 },
  { name: "障子紙（強化）", unit: "枚", threshold_qty: 10.0, current_qty: 18.0 },
  { name: "襖紙（白）",   unit: "枚", threshold_qty: 10.0, current_qty: 20.0 },
  { name: "襖紙（柄）",   unit: "枚", threshold_qty: 10.0, current_qty: 22.0 },
  { name: "網戸ネット",   unit: "m",  threshold_qty: 20.0, current_qty: 35.0 },
  { name: "木枠材",       unit: "本", threshold_qty: 30.0, current_qty: 50.0 },
  { name: "桟",           unit: "本", threshold_qty: 30.0, current_qty: 45.0 },
  { name: "タタミ表",     unit: "枚", threshold_qty: 10.0, current_qty: 15.0 },
  { name: "カーテンレール", unit: "本", threshold_qty: 8.0, current_qty: 12.0 },
  { name: "カーテン生地",   unit: "m",  threshold_qty: 25.0, current_qty: 40.0 },
]

materials = materials_seed.map do |m|
  Material.create!(
    name: m[:name],
    unit: m[:unit],
    current_qty: m[:current_qty],
    threshold_qty: m[:threshold_qty]
  )
end

# ---- 顧客（基本情報）
say "Create customers"
customers = []
50.times do
  customer = Customer.create!(
    name: Faker::Name.name,
    name_kana: nil,
    phone: ["090", "080", "070"].sample + "-" + rand(1000..9999).to_s + "-" + rand(1000..9999).to_s,
    address: ["大分市", "別府市", "臼杵市", "由布市", "杵築市", "豊後高田市", "日田市", "中津市"].sample + Faker::Address.street_address
  )
  customers << customer
end

# ---- 見積（現在の規格に準拠）
say "Create estimates"
def jst_iso(dt)
  (dt.to_time.in_time_zone('Asia/Tokyo')).iso8601
end

estimates = []
20.times do
  scheduled = (jst_today + rand(-7..7)).to_datetime.change({ hour: [9, 11, 13, 15].sample, min: [0, 30].sample })
  customer = customers.sample
  
  # 見積の状態を決定（最初は全てscheduled）
  status = "scheduled"
  accepted = nil
  price_cents = nil
  
  # 見積を作成
  estimate = Estimate.create!(
    scheduled_at: jst_iso(scheduled),
    customer: customer,
    project_id: nil,
    customer_snapshot: {
      name: customer.name,
      phone: customer.phone || "090-0000-0000",
      address: customer.address || "大分市"
    },
    status: status,
    accepted: accepted,
    price_cents: price_cents
  )
  
  # 見積項目を作成（1〜3行）
  rand(1..3).times do
    material = materials.sample
    EstimateItem.create!(
      estimate: estimate,
      material: material,
      material_name: material.name,
      qty: [0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0].sample,
      unit: material.unit,
      category: ["障子", "襖", "網戸", "カーテン", "その他"].sample,
      position: rand(0..10)
    )
  end
  
  estimates << estimate
end

# ---- プロジェクト（見積成立後のみ作成）
say "Create projects from accepted estimates"
projects = []

# 一部の見積を成立状態に変更
estimates.sample(8).each do |estimate|
  # プロジェクトを作成
  project = Project.create!(
    customer: estimate.customer,
    title: "#{estimate.customer.name}様 #{['障子','襖','網戸','カーテン'].sample} #{[2,3,4,6,8].sample}枚",
    status: "in_progress",
    due_on: jst_today + rand(1..14)
  )
  
  projects << project
  
  # 見積を成立状態に更新
  estimate.update!(
    status: "completed",
    accepted: true,
    project: project,
    price_cents: [12000, 30000, 58000, 45000, 75000].sample
  )
  
  # 納品予定を作成
  Delivery.create!(
    project: project,
    date: project.due_on,
    status: "pending",
    title: "納品",
    scheduled_at: project.due_on.to_datetime.change({ hour: 10, min: 0 })
  )
  
  # タスクを作成（1〜3個）
  rand(1..3).times do
    task = Task.create!(
      project: project,
      title: ["障子 張替", "襖 張替", "網戸 張替", "カーテン 取付"].sample + " #{rand(1..5)}枚",
      kind: ["work", "repair", "replace", "install"].sample,
      status: ["todo", "doing"].sample,
      due_on: project.due_on + rand(-2..2)
    )
    
    # タスク材料を作成（1〜2行）
    rand(1..2).times do
      material = materials.sample
      qty_planned = [0.5, 1.0, 1.5, 2.0, 3.0, 4.0].sample
      
      TaskMaterial.create!(
        task: task,
        material: material,
        material_name: material.name,
        qty_planned: qty_planned,
        qty_used: 0.0 # 未完了タスクは使用量0
      )
    end
  end
end

# 一部の見積を不成立状態に変更
estimates.sample(5).each do |estimate|
  next if estimate.project_id.present? # 既にプロジェクトが紐づいているものは除外
  
  estimate.update!(
    status: "completed",
    accepted: false,
    price_cents: nil
  )
end

# ---- 独立したプロジェクト（見積なし）
say "Create independent projects"
10.times do
  customer = customers.sample
  due_on = jst_today + rand(0..10)
  
  project = Project.create!(
    customer: customer,
    title: "#{customer.name}様 #{['障子','襖','網戸','カーテン'].sample} #{[2,3,4,6].sample}枚",
    status: "in_progress",
    due_on: due_on
  )
  
  projects << project
  
  # 納品予定
  Delivery.create!(
    project: project,
    date: due_on,
    status: "pending",
    title: "納品",
    scheduled_at: due_on.to_datetime.change({ hour: 10, min: 0 })
  )
  
  # タスク（1〜3個）
  rand(1..3).times do
    task = Task.create!(
      project: project,
      title: ["障子 張替", "襖 張替", "網戸 張替", "カーテン 取付"].sample + " #{rand(1..5)}枚",
      kind: ["work", "repair", "replace", "install"].sample,
      status: ["todo", "doing"].sample,
      due_on: due_on + rand(-2..2)
    )
    
    # タスク材料
    rand(1..2).times do
      material = materials.sample
      qty_planned = [0.5, 1.0, 1.5, 2.0, 3.0].sample
      
      TaskMaterial.create!(
        task: task,
        material: material,
        material_name: material.name,
        qty_planned: qty_planned,
        qty_used: 0.0
      )
    end
  end
end

# ---- 完了済みプロジェクト（在庫管理の整合性を保つ）
say "Create completed projects with proper inventory management"
5.times do
  customer = customers.sample
  due_on = jst_today - rand(1..14) # 過去の日付
  
  project = Project.create!(
    customer: customer,
    title: "#{customer.name}様 #{['障子','襖','網戸'].sample} 完了案件",
    status: "delivery_scheduled",
    due_on: due_on
  )
  
  projects << project
  
  # 納品（完了）
  Delivery.create!(
    project: project, 
    date: due_on, 
    status: "delivered", 
    title: "納品",
    scheduled_at: due_on.to_datetime.change({ hour: 10, min: 0 })
  )
  
  # 完了済みタスク（在庫減算済み）
  rand(2..3).times do
    task = Task.create!(
      project: project,
      title: ["障子 張替", "襖 張替", "網戸 張替"].sample + " #{rand(1..3)}枚",
      kind: "work",
      status: "done",
      due_on: due_on,
      prepared_at: due_on.to_datetime.change({ hour: 16, min: 0 })
    )
    
    # 材料（使用量を設定して在庫減算）
    rand(1..2).times do
      material = materials.sample
      qty_used = [0.5, 1.0, 1.5, 2.0].sample
      
      # 在庫から減算
      material.update!(current_qty: material.current_qty - qty_used)
      
      TaskMaterial.create!(
        task: task,
        material: material,
        material_name: material.name,
        qty_planned: qty_used,
        qty_used: qty_used
      )
    end
  end
  
  # プロジェクト完了
  project.update!(status: "completed", completed_at: due_on.to_datetime.change({ hour: 17, min: 0 }))
end

# ---- 一部のタスクを完了状態に（在庫管理の整合性を保つ）
say "Complete some tasks with inventory management"
Task.where(status: %w[todo doing]).limit(10).find_each do |task|
  # 在庫チェック
  can_complete = true
  insufficient_materials = []
  
  task.task_materials.each do |tm|
    qty = tm.effective_qty_for_inventory
    next unless qty > 0
    
    material = tm.material
    next unless material
    
    if material.current_qty < qty
      can_complete = false
      insufficient_materials << "#{material.name}（必要:#{qty}、在庫:#{material.current_qty}）"
    end
  end
  
  if can_complete
    # 在庫減算
    task.task_materials.each do |tm|
      qty = tm.effective_qty_for_inventory
      next unless qty > 0
      
      material = tm.material
      next unless material
      
      material.update!(current_qty: material.current_qty - qty)
      tm.update!(qty_used: qty)
    end
    
    # タスク完了
    task.update!(
      status: "done", 
      prepared_at: Time.current
    )
    
    # 監査ログ
    changes = task.task_materials.filter_map do |tm|
      q = tm.effective_qty_for_inventory
      next if q <= 0
      name = tm.material&.name || tm.material_name
      "#{name} -#{q.to_s('F')}"
    end
    
    summary = changes.present? ? "タスク完了（在庫: #{changes.join(' / ')}）" : "タスク完了"
    
    AuditLog.create!(
      action: "task.complete", 
      target_type: "task", 
      target_id: task.id, 
      summary: summary,
      inverse: { method: "POST", path: "/api/tasks/#{task.id}/revert-complete", payload: {} }
    )
  end
end

# ---- 顧客メモ
say "Create customer memos"
customers.sample(15).each do |customer|
  rand(1..3).times do
    CustomerMemo.create!(
      customer: customer,
      body: [
        "お客様からの要望：#{['早めの納品', '品質重視', '価格重視', 'アフターサービス'].sample}",
        "連絡事項：#{['電話連絡済み', 'メール送信済み', '訪問予定', '見積もり検討中'].sample}",
        "特記事項：#{['高齢者対応', 'ペット対応', '駐車場確保', '騒音対策'].sample}"
      ].sample
    )
  end
end

# ---- 写真データ（プロジェクト用）
say "Create project photos"
projects.sample(8).each do |project|
  rand(1..3).times do
    Photo.create!(
      project: project,
      kind: ["before", "after", "other"].sample,
      blob_key: "dummy_photo_#{SecureRandom.hex(8)}",
      filename: "#{project.title}_#{['before', 'after', 'work'].sample}.jpg",
      content_type: "image/jpeg",
      byte_size: rand(100000..5000000)
    )
  end
end

# ---- 在庫不足のテストケース
say "Create low stock test cases"
low_stock_material = Material.find_by(name: "障子紙（標準）")
low_stock_material.update!(current_qty: 3.0) # threshold_qty=15より少ない

# この材料を使用するタスクを作成（完了時に在庫不足エラーが発生する）
test_customer = Customer.create!(
  name: "テスト顧客（在庫不足）",
  phone: "090-TEST-STOCK",
  address: "テスト住所"
)

test_project = Project.create!(
  customer: test_customer,
  title: "テスト案件（在庫不足）",
  status: "in_progress",
  due_on: jst_today + 3
)

test_task = Task.create!(
  project: test_project,
  title: "障子 張替 5枚",
  kind: "work",
  status: "todo",
  due_on: jst_today + 3
)

TaskMaterial.create!(
  task: test_task,
  material: low_stock_material,
  material_name: low_stock_material.name,
  qty_planned: 5.0,
  qty_used: 0.0
)

# ---- 完了
say "Done."
puts
puts "Counts:"
puts "  Customers : #{Customer.count}"
puts "  Materials : #{Material.count}"
puts "  Projects  : #{Project.count} (completed: #{Project.where(status: 'completed').count})"
puts "  Tasks     : #{Task.count} (todo: #{Task.where(status: 'todo').count}, done: #{Task.where(status: 'done').count})"
puts "  Deliveries: #{Delivery.count} (pending: #{Delivery.where(status: 'pending').count}, delivered: #{Delivery.where(status: 'delivered').count})"
puts "  Estimates : #{Estimate.count}"
puts "  EstimateItems: #{EstimateItem.count}"
puts "  TaskMaterials: #{TaskMaterial.count}"
puts "  CustomerMemos: #{CustomerMemo.count}"
puts "  Photos: #{Photo.count}"
puts
puts "Test Cases:"
puts "  Low stock material: #{low_stock_material.name} (current: #{low_stock_material.current_qty}, threshold: #{low_stock_material.threshold_qty})"
puts "  Test task ID: #{test_task.id} (will fail completion due to insufficient stock)"
