require "rails_helper"

RSpec.describe "Customers Ledger", type: :request do
  it "一覧/詳細/登録/更新ができ、POST/PATCH はIdempotency対応" do
    # 既存データ
    c1 = Customer.create!(name: "山田太郎", phone: "090-1111-2222", address: "大分市")
    c2 = Customer.create!(name: "佐藤花子", phone: "090-3333-4444", address: "別府市")

    # 一覧
    get "/api/customers?order=name.asc&limit=200"
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body).dig("data", "items").size).to be >= 2

    # 新規（Idempotency）
    headers = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "idem-cust-1" }
    post "/api/customers", params: { name: "鈴木一郎", phone: "090-5555-6666" }.to_json, headers: headers
    expect(response).to have_http_status(:created)
    body1 = JSON.parse(response.body); new_id = body1.dig("data", "id")
    # 同キー再送
    post "/api/customers", params: { name: "鈴木一郎", phone: "090-5555-6666" }.to_json, headers: headers
    expect(JSON.parse(response.body)).to eq(body1)

    # 詳細
    get "/api/customers/#{new_id}"
    expect(response).to have_http_status(:ok)
    detail = JSON.parse(response.body).dig("data", "customer")
    expect(detail["name"]).to eq "鈴木一郎"

    # 更新（Idempotency）
    headers2 = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "idem-cust-up-1" }
    patch "/api/customers/#{new_id}", params: { address: "臼杵市" }.to_json, headers: headers2
    expect(response).to have_http_status(:ok)
    body_up = JSON.parse(response.body)
    expect(body_up.dig("data", "customer", "address")).to eq "臼杵市"
    # 同キー再送
    patch "/api/customers/#{new_id}", params: { address: "臼杵市" }.to_json, headers: headers2
    expect(JSON.parse(response.body)).to eq(body_up)
  end
end
