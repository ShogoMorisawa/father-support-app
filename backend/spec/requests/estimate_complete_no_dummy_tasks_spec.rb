require "rails_helper"

RSpec.describe "Estimate complete without dummy tasks", type: :request do
  it "見積成立してもタスクは自動生成されない" do
    est = Estimate.create!(customer_name: "田中太郎", scheduled_at: Time.current, status: "scheduled")
    post "/api/estimates/#{est.id}/complete", params: { accepted: true }.to_json,
         headers: { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "est-cmp-1" }
    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    pid  = body.dig("data", "projectId")
    expect(pid).to be_present
    expect(Task.where(project_id: pid).count).to eq 0
  end
end
