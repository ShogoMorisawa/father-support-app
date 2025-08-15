require "rails_helper"

RSpec.describe "Projects::Complete / Revert", type: :model do
  it "完了→在庫減算・納品削除、取り消し→在庫復元・納品復活・監査が記録される" do
    # 準備：顧客・案件・在庫・作業＋使用材料・納品予定
    material = create(:material, name: "障子紙（標準）", current_qty: 5, threshold_qty: 10)
    project  = create(:project, title: "B様 障子4枚", status: "in_progress", due_on: Date.today)
    task     = create(:task, project: project, title: "作業", status: "todo")
    create(:task_material, task: task, material: material, material_name: material.name, qty_planned: 4, qty_used: 4)
    Delivery.create!(project: project, date: Date.today + 1, status: "pending", title: "納品")

    # 実行：完了
    res1 = Projects::CompleteService.call(project_id: project.id)
    expect(res1.ok).to be true
    project.reload
    material.reload

    # 在庫 5 -> 1（閾値10未満で lowStock に含まれる）
    expect(project.status).to eq "completed"
    expect(material.current_qty.to_f).to eq 1.0
    expect(Delivery.where(project_id: project.id, status: "pending")).to be_empty
    expect(res1.low_stock).to be_present
    expect(AuditLog.where(action: "project.complete", target_id: project.id)).to exist

    # 実行：取り消し
    res2 = Projects::RevertCompleteService.call(project_id: project.id)
    expect(res2.ok).to be true
    project.reload
    material.reload

    expect(project.status).to eq "delivery_scheduled"
    expect(material.current_qty.to_f).to eq 5.0
    expect(Delivery.where(project_id: project.id, status: "pending")).to exist
    expect(AuditLog.where(action: "project.revert_complete", target_id: project.id)).to exist
  end
end
