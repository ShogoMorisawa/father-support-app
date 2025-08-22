require "rails_helper"

RSpec.describe "Projects Completed API", type: :request do
  def json = JSON.parse(response.body)

  it "完了済み案件一覧を取得できる" do
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
    expect(json["data"]["items"].length).to eq 1
    
    item = json["data"]["items"].first
    expect(item["id"]).to eq p.id
    expect(item["title"]).to eq "佐藤様 障子3枚"
    expect(item["customerName"]).to eq "佐藤"
    expect(item["completedAt"]).to be_present
    expect(item["undo"]).to be_present
  end

  it "期間フィルタが正しく動作する" do
    c = create(:customer, name: "田中")
    p = create(:project, customer: c, title: "田中様 タタミ", status: "completed", due_on: Date.today)
    
    # 現在時刻で完了
    now = Time.current
    AuditLog.create!(
      action: "project.complete",
      target_type: "project",
      target_id: p.id,
      summary: "納品完了",
      inverse: {},
      created_at: now
    )

    # 今日の範囲で検索
    get "/api/projects/completed", params: { from: Date.today.to_s, to: Date.today.to_s }
    
    expect(response).to have_http_status(:ok)
    expect(json["data"]["items"].length).to eq 1
    
    # 明日の範囲で検索（結果なし）
    get "/api/projects/completed", params: { from: (Date.today + 1).to_s, to: (Date.today + 1).to_s }
    
    expect(response).to have_http_status(:ok)
    expect(json["data"]["items"].length).to eq 0
  end

  it "キーワード検索が正しく動作する" do
    c1 = create(:customer, name: "佐藤")
    c2 = create(:customer, name: "田中")
    p1 = create(:project, customer: c1, title: "障子張替え", status: "completed", due_on: Date.today)
    p2 = create(:project, customer: c2, title: "タタミ張替え", status: "completed", due_on: Date.today)
    
    [p1, p2].each do |project|
      AuditLog.create!(
        action: "project.complete",
        target_type: "project",
        target_id: project.id,
        summary: "納品完了",
        inverse: {}
      )
    end

    # "障子"で検索
    get "/api/projects/completed", params: { q: "障子" }
    
    expect(response).to have_http_status(:ok)
    expect(json["data"]["items"].length).to eq 1
    expect(json["data"]["items"].first["title"]).to eq "障子張替え"
    
    # "田中"で検索
    get "/api/projects/completed", params: { q: "田中" }
    
    expect(response).to have_http_status(:ok)
    expect(json["data"]["items"].length).to eq 1
    expect(json["data"]["items"].first["customerName"]).to eq "田中"
  end

  it "並び替えが正しく動作する" do
    c = create(:customer, name: "佐藤")
    p1 = create(:project, customer: c, title: "案件1", status: "completed", due_on: Date.today)
    p2 = create(:project, customer: c, title: "案件2", status: "completed", due_on: Date.today)
    
    # 異なる時刻で完了
    AuditLog.create!(
      action: "project.complete",
      target_type: "project",
      target_id: p1.id,
      summary: "納品完了",
      inverse: {},
      created_at: 2.hours.ago
    )
    
    AuditLog.create!(
      action: "project.complete",
      target_type: "project",
      target_id: p2.id,
      summary: "納品完了",
      inverse: {},
      created_at: 1.hour.ago
    )

    # 降順（新しい順）
    get "/api/projects/completed", params: { order: "completed.desc" }
    
    expect(response).to have_http_status(:ok)
    items = json["data"]["items"]
    expect(items.length).to eq 2
    expect(items[0]["id"]).to eq p2.id  # 1時間前
    expect(items[1]["id"]).to eq p1.id  # 2時間前
    
    # 昇順（古い順）
    get "/api/projects/completed", params: { order: "completed.asc" }
    
    expect(response).to have_http_status(:ok)
    items = json["data"]["items"]
    expect(items.length).to eq 2
    expect(items[0]["id"]).to eq p1.id  # 2時間前
    expect(items[1]["id"]).to eq p2.id  # 1時間前
  end

  it "完了していない案件は表示されない" do
    c = create(:customer, name: "佐藤")
    p = create(:project, customer: c, title: "進行中案件", status: "delivery_scheduled", due_on: Date.today)
    
    # 完了ログなし
    
    get "/api/projects/completed"
    
    expect(response).to have_http_status(:ok)
    expect(json["data"]["items"].length).to eq 0
  end
end
