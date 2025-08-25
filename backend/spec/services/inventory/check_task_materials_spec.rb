require 'rails_helper'

RSpec.describe Inventory::CheckTaskMaterials do
  let(:project) { create(:project) }
  let(:material) { create(:material, name: "障子紙", current_qty: 5.0) }
  
  describe '.call' do
    context 'タスクに材料が設定されている場合' do
      let!(:task) do
        create(:task, project: project).tap do |t|
          create(:task_material, task: t, material: material, qty_planned: 3.0)
        end
      end

      it '在庫が十分な場合は充足と判定する' do
        result = described_class.call(task_ids: [task.id])
        
        expect(result.first[:task_id]).to eq(task.id)
        expect(result.first[:stock_sufficient]).to be true
        expect(result.first[:insufficient_materials]).to be_empty
      end

      it '在庫が不足している場合は不足と判定する' do
        material.update!(current_qty: 1.0)
        
        result = described_class.call(task_ids: [task.id])
        
        expect(result.first[:stock_sufficient]).to be false
        expect(result.first[:insufficient_materials]).to contain_exactly(
          hash_including(
            name: "障子紙",
            required: 3.0,
            available: 1.0,
            shortage: 2.0
          )
        )
      end
    end

    context 'qty_plannedがnilまたは0の場合' do
      let!(:task) do
        create(:task, project: project).tap do |t|
          create(:task_material, task: t, material: material, qty_planned: nil)
          create(:task_material, task: t, material: material, qty_planned: 0)
        end
      end

      it '判定に影響しない' do
        result = described_class.call(task_ids: [task.id])
        
        expect(result.first[:stock_sufficient]).to be true
        expect(result.first[:insufficient_materials]).to be_empty
      end
    end

    context 'material_nameのみで材料が設定されている場合' do
      let!(:task) do
        create(:task, project: project).tap do |t|
          create(:task_material, task: t, material_name: "障子紙", qty_planned: 3.0)
        end
      end

      it 'material_nameで材料を検索して判定する' do
        result = described_class.call(task_ids: [task.id])
        
        expect(result.first[:stock_sufficient]).to be true
      end
    end

    context '空のタスクID配列の場合' do
      it '空配列を返す' do
        result = described_class.call(task_ids: [])
        
        expect(result).to be_empty
      end
    end
  end
end
