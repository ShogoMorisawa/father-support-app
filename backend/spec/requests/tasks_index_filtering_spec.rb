require "rails_helper"

RSpec.describe "GET /api/tasks フィルタ", type: :request do
  it "projects.status が completed のタスクは返さず、todo/doing のみ返す" do
    # 進行中の案件に紐づくタスク（表示されるべき）
    pj_active = create(:project, status: "in_progress", due_on: Date.today)
    t1 = create(:task, project: pj_active, status: "todo",  due_on: Date.today)
    t2 = create(:task, project: pj_active, status: "doing", due_on: Date.today)

    # 完了済みの案件に紐づくタスク（表示されないべき）
    pj_done = create(:project, status: "completed", due_on: Date.today)
    t3 = create(:task, project: pj_done, status: "todo", due_on: Date.today)

    get "/api/tasks?order=due.asc&limit=50"
    expect(response).to have_http_status(:ok)
    ids = JSON.parse(response.body).dig("data", "items").map { |x| x["id"] }

    expect(ids).to include(t1.id, t2.id)
    expect(ids).not_to include(t3.id)
  end
end
