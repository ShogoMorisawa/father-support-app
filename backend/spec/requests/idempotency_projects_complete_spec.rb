require "rails_helper"

RSpec.describe "Idempotency for Projects Complete", type: :request do
  it "同一キーなら2回目は結果リプレイされ、監査ログが増えない" do
    material = create(:material, name: "障子紙", current_qty: 10, threshold_qty: 0)
    project  = create(:project)
    task     = create(:task, project: project)
    create(:task_material, task: task, material: material, qty_used: 2)

    headers = { "CONTENT_TYPE" => "application/json", "X-Idempotency-Key" => "same-key" }

    post "/api/projects/#{project.id}/complete", params: {}.to_json, headers: headers
    expect(response).to have_http_status(:ok)
    body1 = JSON.parse(response.body)

    # 2回目：同じキー → レスポンスが一致
    post "/api/projects/#{project.id}/complete", params: {}.to_json, headers: headers
    expect(response).to have_http_status(:ok)
    body2 = JSON.parse(response.body)
    expect(body2).to eq(body1)

    # 監査ログは1件のまま（2回目は実行されず）
    expect(AuditLog.where(action: "project.complete", target_id: project.id).count).to eq 1
  end
end
