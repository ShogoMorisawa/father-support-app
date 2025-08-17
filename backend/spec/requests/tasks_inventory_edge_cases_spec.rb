require "rails_helper"

RSpec.describe "Task inventory edge cases", type: :request do
  let!(:mat) { Material.create!(name: "障子紙", unit: "枚", current_qty: 10, threshold_qty: 2) }
  let!(:cust){ Customer.create!(name: "検証") }
  let!(:proj){ Project.create!(customer: cust, title: "検証案件", status: "in_progress", due_on: Date.today) }
  let!(:task){ Task.create!(project: proj, title: "障子3枚", status: "todo", due_on: proj.due_on) }

  def complete_with_key(key)
    post "/api/tasks/#{task.id}/complete", headers: { "X-Idempotency-Key" => key }
  end

  it "qty_used=nil（物理的には0.0）と qty_planned=3.0 → 3だけ減る" do
    TaskMaterial.create!(task: task, material: mat, material_name: mat.name, qty_planned: 3)
    complete_with_key("k1")
    expect(response).to have_http_status(:ok)
    expect(mat.reload.current_qty.to_f).to eq 7.0
  end

  it "qty_used=0.0 と qty_planned=3.0 → 3だけ減る" do
    TaskMaterial.create!(task: task, material: mat, material_name: mat.name, qty_planned: 3, qty_used: 0)
    complete_with_key("k2")
    expect(response).to have_http_status(:ok)
    expect(mat.reload.current_qty.to_f).to eq 7.0
  end

  it "qty_used=2.0 と qty_planned=3.0 → 2だけ減る" do
    TaskMaterial.create!(task: task, material: mat, material_name: mat.name, qty_planned: 3, qty_used: 2)
    complete_with_key("k3")
    expect(mat.reload.current_qty.to_f).to eq 8.0
  end

  it "同じタスクを別キーで二重完了 → 409（競合）" do
    TaskMaterial.create!(task: task, material: mat, material_name: mat.name, qty_planned: 1)
    complete_with_key("k4")
    expect(response).to have_http_status(:ok)
    post "/api/tasks/#{task.id}/complete", headers: { "X-Idempotency-Key" => "another" }
    expect(response).to have_http_status(:conflict)
  end

  it "同じキーでの再送は結果リプレイ（200同一応答）" do
    TaskMaterial.create!(task: task, material: mat, material_name: mat.name, qty_planned: 1)
    complete_with_key("k5")
    body = response.body
    complete_with_key("k5")
    expect(response.body).to eq body
  end
end
