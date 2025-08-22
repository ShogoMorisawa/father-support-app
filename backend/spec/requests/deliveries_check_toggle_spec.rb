require "rails_helper"

RSpec.describe "Deliveries Check toggle", type: :request do
  def json = JSON.parse(response.body)

  it "チェックONで完了＋在庫減算、OFFで取り消し＋在庫復元。Idempotencyで副作用は1回限り" do
    m  = create(:material, name: "障子紙", current_qty: 10, threshold_qty: 2)
    c  = create(:customer, name: "佐藤")
    p  = create(:project, customer: c, status: "delivery_scheduled", due_on: Date.today)
    d  = Delivery.create!(project: p, date: p.due_on, status: "pending", title: "納品")
    t  = Task.create!(project: p, title: "障子3枚", status: "todo", due_on: p.due_on)
    TaskMaterial.create!(task: t, material: m, material_name: m.name, qty_planned: 3, qty_used: 0)

    # ON → 完了＋在庫 10→7
    headers_on = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "chk-on-1" }
    post "/api/deliveries/#{d.id}/check", params: { taskId: t.id, prepared: true }.to_json, headers: headers_on
    expect(response).to have_http_status(:ok)
    expect(Material.find(m.id).current_qty.to_f).to eq 7.0
    expect(Task.find(t.id).status).to eq "done"
    expect(Task.find(t.id).prepared_at).to be_present

    # 同キー再送 → レスポンスリプレイ・在庫据え置き
    post "/api/deliveries/#{d.id}/check", params: { taskId: t.id, prepared: true }.to_json, headers: headers_on
    expect(response).to have_http_status(:ok)
    expect(Material.find(m.id).current_qty.to_f).to eq 7.0

    # OFF → 取り消し＋在庫 7→10
    headers_off = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "chk-off-1" }
    post "/api/deliveries/#{d.id}/check", params: { taskId: t.id, prepared: false }.to_json, headers: headers_off
    expect(response).to have_http_status(:ok)
    expect(Material.find(m.id).current_qty.to_f).to eq 10.0
    task = Task.find(t.id)
    expect(task.status).to eq "todo"
    expect(task.prepared_at).to be_nil
  end

  it "別プロジェクトのタスクIDを弾く（422）" do
    p1 = create(:project)
    p2 = create(:project)
    d  = Delivery.create!(project: p1, date: Date.today, status: "pending", title: "納品")
    t2 = Task.create!(project: p2, title: "別案件", status: "todo", due_on: Date.today)
    headers = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "chk-err-1" }
    post "/api/deliveries/#{d.id}/check", params: { taskId: t2.id, prepared: true }.to_json, headers: headers
    expect(response).to have_http_status(422)
  end

  it "在庫不足時は422エラーで完了を拒否し、在庫は据え置き" do
    m  = create(:material, name: "障子紙", current_qty: 2, threshold_qty: 1) # 在庫2
    c  = create(:customer, name: "佐藤")
    p  = create(:project, customer: c, status: "delivery_scheduled", due_on: Date.today)
    d  = Delivery.create!(project: p, date: p.due_on, status: "pending", title: "納品")
    t  = Task.create!(project: p, title: "障子5枚", status: "todo", due_on: p.due_on)
    TaskMaterial.create!(task: t, material: m, material_name: m.name, qty_planned: 5, qty_used: 0)

    initial_qty = m.current_qty
    headers = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "insufficient-1" }
    post "/api/deliveries/#{d.id}/check", params: { taskId: t.id, prepared: true }.to_json, headers: headers
    
    expect(response).to have_http_status(422)
    expect(json["error"]["code"]).to eq "insufficient_stock"
    expect(json["error"]["message"]).to include("在庫が不足しています")
    expect(json["error"]["message"]).to include("障子紙（必要:5.0、在庫:2.0）")
    
    # 在庫は据え置き
    expect(Material.find(m.id).current_qty.to_f).to eq initial_qty.to_f
    # タスク状態も変更されていない
    expect(Task.find(t.id).status).to eq "todo"
    expect(Task.find(t.id).prepared_at).to be_nil
  end
end
