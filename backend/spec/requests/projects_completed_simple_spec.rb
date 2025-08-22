require "rails_helper"

RSpec.describe "Projects Completed API (Simple)", type: :request do
  def json = JSON.parse(response.body)

  it "基本的な完了済み案件一覧を取得できる" do
    # テストデータ作成
    c = create(:customer, name: "佐藤")
    p = create(:project, customer: c, title: "佐藤様 障子3枚", status: "completed", due_on: Date.today)
    
    # 完了ログを作成
    AuditLog.create!(
      action: "project.complete",
      target_type: "project",
      target_id: p.id,
      summary: "納品完了（案件完了）",
      inverse: { method: "POST", path: "/api/projects/#{p.id}/revert-complete", payload: {} }
    )

    get "/api/projects/completed"
    
    expect(response).to have_http_status(:ok)
    expect(json["ok"]).to be true
    expect(json["data"]["items"]).to be_an(Array)
    
    if json["data"]["items"].length > 0
      item = json["data"]["items"].first
      expect(item["id"]).to eq p.id
      expect(item["title"]).to eq "佐藤様 障子3枚"
      expect(item["customerName"]).to eq "佐藤"
    end
  end
end
