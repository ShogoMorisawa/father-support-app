require "rails_helper"

RSpec.describe "Project complete gating", type: :request do
  let!(:customer) { Customer.create!(name: "モリサワ様") }
  let!(:project)  { Project.create!(customer: customer, title: "納品テスト", status: "delivery_scheduled", due_on: Date.today + 3) }
  let!(:delivery) { Delivery.create!(project: project, date: project.due_on, status: "pending", title: "納品") }

  def complete!(key: "k1")
    post "/api/projects/#{project.id}/complete", headers: { "X-Idempotency-Key" => key }
  end

  def revert!(key: "r1")
    post "/api/projects/#{project.id}/revert-complete", headers: { "X-Idempotency-Key" => key }
  end

  it "未準備/未完了のタスクがあると 422 を返す" do
    Task.create!(project: project, title: "障子3枚", status: "todo", due_on: project.due_on)
    complete!
    expect(response).to have_http_status(422)
    expect(JSON.parse(response.body).dig("error")).to be_present
  end

  it "全タスクが done & prepared のとき完了でき、Delivery は delivered になる" do
    t1 = Task.create!(project: project, title: "障子3枚", status: "done", due_on: project.due_on, prepared_at: Time.current)
    t2 = Task.create!(project: project, title: "網戸5枚", status: "done", due_on: project.due_on, prepared_at: Time.current)

    complete!(key: "k-ok")
    expect(response).to have_http_status(:ok)
    expect(project.reload.status).to eq "completed"
    expect(Delivery.where(project_id: project.id, status: "delivered").count).to be >= 1

    revert!(key: "k-revert")
    expect(response).to have_http_status(:ok)
    expect(project.reload.status).to eq "delivery_scheduled"
    expect(Delivery.where(project_id: project.id, status: "pending").count).to be >= 1
  end
end
