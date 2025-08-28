require 'rails_helper'

RSpec.describe 'Estimates API with Stock', type: :request do
  let!(:material1) { create(:material, name: '障子紙', current_qty: 10.0, unit: '枚', threshold_qty: 2.0) }
  let!(:material2) { create(:material, name: '糊', current_qty: 3.0, unit: '本', threshold_qty: 1.0) }
  let!(:customer) { create(:customer, name: 'テスト顧客') }
  let!(:estimate) { create(:estimate, customer: customer, status: 'scheduled') }

  before do
    create(:estimate_item, estimate: estimate, material: material1, material_name: '障子紙', quantity: 5.0)
    create(:estimate_item, estimate: estimate, material: material2, material_name: '糊', quantity: 2.0)
  end

  describe 'GET /api/estimates?withStock=1' do
    it '在庫情報付きで見積一覧を返す' do
      get '/api/estimates?withStock=1'

      expect(response).to have_http_status(:ok)
      
      json = JSON.parse(response.body)
      expect(json['ok']).to be true
      expect(json['data']['items']).to be_an(Array)
      expect(json['data']['items'].length).to eq(1)

      item = json['data']['items'].first
      expect(item).to include(
        'id' => estimate.id,
        'status' => 'scheduled',
        'stockPreview' => {
          'overallStatus' => 'ok',
          'summary' => {
            'insufficient_count' => 0,
            'unregistered_count' => 0
          },
          'perLine' => [
            { 'status' => 'ok' },
            { 'status' => 'ok' }
          ],
          'shortages' => [],
          'unregistered' => []
        }
      )
      
      # estimateItems の存在と内容を別途確認
      expect(item).to have_key('estimateItems')
      expect(item['estimateItems'].length).to eq(2)
      expect(item['estimateItems'].first).to include(
        'materialName' => '障子紙',
        'quantity' => '5.0',
        'material' => {
          'id' => material1.id,
          'name' => '障子紙',
          'unit' => '枚'
        }
      )
      expect(item['estimateItems'].second).to include(
        'materialName' => '糊',
        'quantity' => '2.0',
        'material' => {
          'id' => material2.id,
          'name' => '糊',
          'unit' => '本'
        }
      )
    end

    context '在庫不足がある場合' do
      before do
        material1.update!(current_qty: 2.0) # 不足状態にする
      end

      it 'shortage ステータスで返す' do
        get '/api/estimates?withStock=1'

        expect(response).to have_http_status(:ok)
        
        json = JSON.parse(response.body)
        item = json['data']['items'].first
        
        expect(item['stockPreview']['overallStatus']).to eq('shortage')
        expect(item['stockPreview']['summary']['insufficient_count']).to eq(1)
        expect(item['stockPreview']['shortages']).to contain_exactly(
          hash_including(
            'name' => '障子紙',
            'required' => 5.0,
            'available' => 2.0,
            'shortage' => 3.0,
            'unit' => '枚'
          )
        )
      end
    end

    context '未登録材料がある場合' do
      before do
        create(:estimate_item, estimate: estimate, material: nil, material_name: '未登録材料', quantity: 1.0)
      end

      it 'unregistered 情報を返す' do
        get '/api/estimates?withStock=1'

        expect(response).to have_http_status(:ok)
        
        json = JSON.parse(response.body)
        item = json['data']['items'].first
        
        expect(item['stockPreview']['overallStatus']).to eq('ok')
        expect(item['stockPreview']['summary']['unregistered_count']).to eq(1)
        expect(item['stockPreview']['unregistered']).to contain_exactly(
          hash_including(
            'name' => '未登録材料',
            'required' => 1.0,
            'unit' => '個'
          )
        )
      end
    end
  end

  describe 'GET /api/estimates (without withStock)' do
    it '在庫情報なしで見積一覧を返す' do
      get '/api/estimates'

      expect(response).to have_http_status(:ok)
      
      json = JSON.parse(response.body)
      item = json['data']['items'].first
      
      expect(item).not_to have_key('stockPreview')
      expect(item).not_to have_key('estimateItems')
    end
  end
end
