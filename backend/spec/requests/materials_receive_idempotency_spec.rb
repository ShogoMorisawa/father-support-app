require "rails_helper"

RSpec.describe "Idempotency for Materials Receive", type: :request do
  it "同一キーで結果リプレイ（2回目以降は副作用なし）" do
    mat = create(:material, current_qty: 1, threshold_qty: 0)
    headers = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "idem-mat-1" }
    payload = { quantity: 3 }.to_json

    post "/api/materials/#{mat.id}/receive", params: payload, headers: headers
    expect(response).to have_http_status(:ok)
    body1 = JSON.parse(response.body)

    post "/api/materials/#{mat.id}/receive", params: payload, headers: headers
    expect(response).to have_http_status(:ok)
    body2 = JSON.parse(response.body)
    expect(body2).to eq(body1)

    mat.reload
    expect(mat.current_qty.to_f).to eq 4.0 # 1回分のみ加算
  end
end
