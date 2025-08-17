require "rails_helper"

RSpec.describe "Task complete & Delivery check", type: :request do
  it "タスク完了で在庫が減り、チェックはタスク単位でON/OFFできる" do
    m = Material.create!(name: "障子紙", unit: "枚", current_qty: 10, threshold_qty: 2)
    c = Customer.create!(name: "森沢")
    p = Project.create!(customer: c, title: "森沢様", status: "in_progress", due_on: Date.today + 3)
    d = Delivery.create!(project: p, date: p.due_on, status: "pending", title: "納品")
    t = Task.create!(project: p, title: "障子3枚", status: "todo", due_on: p.due_on)
    TaskMaterial.create!(task: t, material: m, material_name: m.name, qty_planned: 3)

    # 完了 → 在庫 10→7
    headers = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "tkc-1" }
    post "/api/tasks/#{t.id}/complete", headers: headers
    expect(response).to have_http_status(:ok)
    expect(Material.find(m.id).current_qty.to_f).to eq 7.0

    # チェックON
    headers2 = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "chk-1" }
    post "/api/deliveries/#{d.id}/check", params: { taskId: t.id, prepared: true }.to_json, headers: headers2
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body).dig("data","tasks").first["preparedAt"]).to be_present

    # 取り消し → 在庫 7→10
    headers3 = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "tkc-r1" }
    post "/api/tasks/#{t.id}/revert-complete", headers: headers3
    expect(Material.find(m.id).current_qty.to_f).to eq 10.0
  end
end
