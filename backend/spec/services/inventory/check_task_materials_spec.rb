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
        result = described_class.call(task: task)
        
        expect(result.stock_sufficient).to be true
        expect(result.insufficient_materials).to be_empty
        expect(result.unregistered_materials).to be_empty
      end

      it '在庫が不足している場合は不足と判定する' do
        material.update!(current_qty: 1.0)
        
        result = described_class.call(task: task)
        
        expect(result.stock_sufficient).to be false
        expect(result.insufficient_materials).to contain_exactly(
          hash_including(
            name: "障子紙",
            required: 4.0, # FactoryBotのデフォルト値
            available: 1.0,
            shortage: 3.0
          )
        )
        expect(result.unregistered_materials).to be_empty
      end
    end

    context 'qty_used が優先される場合' do
      let!(:task) do
        create(:task, project: project).tap do |t|
          create(:task_material, task: t, material: material, qty_used: 2.0, qty_planned: 3.0)
        end
      end

      it 'qty_used が qty_planned より優先される' do
        material.update!(current_qty: 2.5)
        
        result = described_class.call(task: task)
        
        expect(result.stock_sufficient).to be true
        expect(result.insufficient_materials).to be_empty
      end
    end

    context '未登録材料がある場合' do
      let!(:task) do
        create(:task, project: project).tap do |t|
          create(:task_material, task: t, material: material, qty_planned: 3.0)
          create(:task_material, task: t, material: nil, material_name: "未登録材料", qty_planned: 1.0)
        end
      end

      it '未登録材料は unregistered_materials に入り、不足判定に影響しない' do
        result = described_class.call(task: task)
        
        expect(result.stock_sufficient).to be true
        expect(result.insufficient_materials).to be_empty
        expect(result.unregistered_materials).to contain_exactly(
          hash_including(
            name: "未登録材料",
            required: 4.0, # FactoryBotのデフォルト値
            status: 'unregistered'
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
        result = described_class.call(task: task)
        
        expect(result.stock_sufficient).to be true
        expect(result.insufficient_materials).to be_empty
        expect(result.unregistered_materials).to be_empty
      end
    end
  end
end
