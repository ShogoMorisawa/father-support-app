require 'rails_helper'

RSpec.describe Inventory::CalculateCommittedService do
  let!(:material1) { create(:material, name: '障子紙', current_qty: 10.0) }
  let!(:material2) { create(:material, name: '糊', current_qty: 5.0) }
  let!(:project) { create(:project) }

  describe '.call' do
    context '未完了タスクの材料消費がある場合' do
      let!(:task1) { create(:task, project: project, status: 'todo') }
      let!(:task2) { create(:task, project: project, status: 'doing') }
      let!(:task3) { create(:task, project: project, status: 'done') }

      before do
        # qty_used が優先されるケース
        create(:task_material, task: task1, material: material1, qty_used: 2.0, qty_planned: 1.0)
        # qty_planned が使われるケース
        create(:task_material, task: task2, material: material1, qty_used: nil, qty_planned: 3.0)
        # 完了タスクは含まれない
        create(:task_material, task: task3, material: material1, qty_used: 5.0, qty_planned: 1.0)
        # 別材料
        create(:task_material, task: task1, material: material2, qty_used: 1.5, qty_planned: 2.0)
      end

      it '未完了タスクの材料消費のみを集計する' do
        result = described_class.call

        expect(result[material1.id]).to eq(5.0) # 2.0 (qty_used) + 3.0 (qty_planned)
        expect(result[material2.id]).to eq(1.5) # qty_used が優先
      end
    end

    context 'material_id が nil の場合' do
      let!(:task) { create(:task, project: project, status: 'todo') }

      before do
        create(:task_material, task: task, material: nil, material_name: '未登録材料', qty_planned: 1.0)
      end

      it '未登録材料は集計対象外' do
        result = described_class.call

        expect(result).to be_empty
      end
    end

    context '数量が 0 以下の場合' do
      let!(:task) { create(:task, project: project, status: 'todo') }

      before do
        create(:task_material, task: task, material: material1, qty_used: 0, qty_planned: 0)
        create(:task_material, task: task, material: material1, qty_used: nil, qty_planned: nil)
      end

      it '0以下の数量は集計されない' do
        result = described_class.call

        expect(result[material1.id]).to eq(0)
      end
    end

    context '材料が存在しない場合' do
      it '空のハッシュを返す' do
        result = described_class.call

        expect(result).to eq({})
      end
    end
  end
end
