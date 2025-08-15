require "rails_helper"

RSpec.describe Materials::ReceiveService, type: :model do
  it "入庫で数量が加算され、監査ログに inverse が入る" do
    mat = create(:material, name: "障子紙（標準）", unit: "枚", current_qty: 5, threshold_qty: 10)

    res = described_class.call(material_id: mat.id, quantity: 7)
    expect(res.ok).to be true
    mat.reload
    expect(mat.current_qty.to_f).to eq 12.0

    log = AuditLog.where(action: "material.receive", target_id: mat.id).last
    expect(log).to be_present
    expect(log.inverse).to be_present
    expect(log.inverse["path"]).to eq "/api/materials/#{mat.id}/receive"
    expect(log.inverse["payload"]["quantity"]).to be < 0
  end
end
