require 'rails_helper'

RSpec.describe Estimates::StockPreviewService do
  let!(:material1) { create(:material, name: '障子紙', current_qty: 10.0, unit: '枚', threshold_qty: 2.0) }
  let!(:material2) { create(:material, name: '糊', current_qty: 3.0, unit: '本', threshold_qty: 1.0) }
  let!(:customer) { create(:customer, name: 'テスト顧客') }
  let!(:estimate) { create(:estimate, customer: customer) }

  describe '.call' do
    context '在庫が十分な場合' do
      before do
        create(:estimate_item, estimate: estimate, material: material1, material_name: '障子紙', quantity: 5.0)
        create(:estimate_item, estimate: estimate, material: material2, material_name: '糊', quantity: 2.0)
      end

      it 'overall_status が ok になる' do
        result = described_class.call(estimate: estimate)

        expect(result.overall_status).to eq('ok')
        expect(result.summary[:insufficient_count]).to eq(0)
        expect(result.summary[:unregistered_count]).to eq(0)
        expect(result.per_line).to contain_exactly(
          { status: 'ok' },
          { status: 'ok' }
        )
        expect(result.shortages).to be_empty
        expect(result.unregistered).to be_empty
      end
    end

    context '在庫が不足している場合' do
      before do
        create(:estimate_item, estimate: estimate, material: material1, material_name: '障子紙', quantity: 15.0)
        create(:estimate_item, estimate: estimate, material: material2, material_name: '糊', quantity: 1.0)
      end

      it 'overall_status が shortage になり、不足情報が返される' do
        result = described_class.call(estimate: estimate)

        expect(result.overall_status).to eq('shortage')
        expect(result.summary[:insufficient_count]).to eq(1)
        expect(result.summary[:unregistered_count]).to eq(0)
        expect(result.per_line).to contain_exactly(
          { status: 'shortage' },
          { status: 'ok' }
        )
        expect(result.shortages).to contain_exactly(
          hash_including(
            name: '障子紙',
            required: 15.0,
            available: 10.0,
            shortage: 5.0,
            unit: '枚'
          )
        )
        expect(result.unregistered).to be_empty
      end
    end

    context '未登録材料がある場合' do
      before do
        create(:estimate_item, estimate: estimate, material: material1, material_name: '障子紙', quantity: 5.0)
        create(:estimate_item, estimate: estimate, material: nil, material_name: '未登録材料', quantity: 1.0)
      end

      it '未登録材料は unregistered に入り、overall_status は ok のまま' do
        result = described_class.call(estimate: estimate)

        expect(result.overall_status).to eq('ok')
        expect(result.summary[:insufficient_count]).to eq(0)
        expect(result.summary[:unregistered_count]).to eq(1)
        expect(result.per_line).to contain_exactly(
          { status: 'ok' },
          { status: 'unregistered' }
        )
        expect(result.shortages).to be_empty
        expect(result.unregistered).to contain_exactly(
          hash_including(
            name: '未登録材料',
            required: 1.0,
            unit: '個'
          )
        )
      end
    end

    context '数量が 0 の場合' do
      before do
        create(:estimate_item, estimate: estimate, material: material1, material_name: '障子紙', quantity: 0)
      end

      it '判定に影響しない' do
        result = described_class.call(estimate: estimate)

        expect(result.overall_status).to eq('ok')
        expect(result.summary[:insufficient_count]).to eq(0)
        expect(result.summary[:unregistered_count]).to eq(0)
        expect(result.per_line).to be_empty
        expect(result.shortages).to be_empty
        expect(result.unregistered).to be_empty
      end
    end

    context 'availability_map が提供された場合' do
      let(:availability_map) do
        {
          material1.id => {
            current_qty: 5.0,
            committed_qty: 2.0,
            available_qty: 3.0
          }
        }
      end

      before do
        create(:estimate_item, estimate: estimate, material: material1, material_name: '障子紙', quantity: 4.0)
      end

      it '提供された availability_map を使用する' do
        result = described_class.call(estimate: estimate, availability_map: availability_map)

        expect(result.overall_status).to eq('shortage')
        expect(result.shortages).to contain_exactly(
          hash_including(
            name: '障子紙',
            required: 4.0,
            available: 3.0,
            shortage: 1.0
          )
        )
      end
    end
  end
end
