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

say "Done."
puts
puts "Counts:"
puts "  Customers : #{Customer.count}"
puts "  Materials : #{Material.count}"
puts "  Projects  : #{Project.count} (completed: #{Project.where(status: 'completed').count})"
puts "  Tasks     : #{Task.count} (done: #{Task.where(status: 'done').count})"
puts "  Deliveries: #{Delivery.count} (pending: #{Delivery.where(status: 'pending').count}, delivered: #{Delivery.where(status: 'delivered').count})"
puts "  Estimates : #{Estimate.count}"
