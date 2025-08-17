require "rails_helper"

RSpec.describe "Deliveries Bulk Shift", type: :request do
  def json_body = JSON.parse(response.body)

  it "pendingの納品を+2日シフトし、監査ログのinverseで-2日戻せる" do
    c = create(:customer, name: "佐藤")
    p1 = create(:project, customer: c, status: "delivery_scheduled", due_on: Date.today)
    p2 = create(:project, customer: c, status: "delivery_scheduled", due_on: Date.today)
    d1 = Delivery.create!(project: p1, date: Date.today + 1, status: "pending", title: "納品")
    d2 = Delivery.create!(project: p2, date: Date.today + 2, status: "pending", title: "納品")

    headers = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "bulk-1" }
    post "/api/deliveries/bulk-shift", params: { days: 2, status: "pending" }.to_json, headers: headers
    expect(response).to have_http_status(:ok)
    body = json_body
    expect(body.dig("data", "affected")).to eq 2

    d1.reload; d2.reload
    expect(d1.date).to eq(Date.today + 3)
    expect(d2.date).to eq(Date.today + 4)

    # 監査ログの inverse で戻す（履歴API経由でもよいがここでは直接）
    log = AuditLog.order(created_at: :desc).find_by(action: "deliveries.bulk_shift")
    expect(log).to be_present
    inv = log.inverse
    expect(inv).to be_present
    expect(inv["path"]).to eq "/api/deliveries/bulk-shift"
    expect(inv["payload"]["days"]).to eq(-2)
    expect(inv["payload"]["ids"]).to match_array([ d1.id, d2.id ])

    post inv["path"], params: inv["payload"].to_json, headers: headers.merge("X-Idempotency-Key" => "bulk-undo-1")
    expect(response).to have_http_status(:ok)

    d1.reload; d2.reload
    expect(d1.date).to eq(Date.today + 1)
    expect(d2.date).to eq(Date.today + 2)

    # Idempotency：同キー再実行はリプレイ
    post "/api/deliveries/bulk-shift", params: { days: 2 }.to_json, headers: headers
    expect(response).to have_http_status(:ok)
    body2 = json_body
    post "/api/deliveries/bulk-shift", params: { days: 2 }.to_json, headers: headers
    expect(json_body).to eq(body2)
  end
end
