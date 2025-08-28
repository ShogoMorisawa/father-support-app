require 'rails_helper'

RSpec.describe 'Api::MaterialsAvailability', type: :request do
  let(:project) { create(:project) }
  
  before do
    # 実際のデータベースに存在する材料を使用
    @material1 = Material.find(2)  # 障子紙（強化）: 現在庫12.0, 予定消費28.5, 利用可能-16.5, 閾値10.0
    @material2 = Material.find(5)  # 網戸ネット: 現在庫18.0, 予定消費30.0, 利用可能-12.0, 閾値20.0
    @material3 = Material.find(8)  # タタミ表: 現在庫18.0, 予定消費26.5, 利用可能-8.5, 閾値10.0
    
    # 既存のタスクと材料の関係はそのまま使用（シードデータ）
  end

  describe 'GET /api/materials/availability' do
    it '在庫可用性情報を正しく返す' do
      get '/api/materials/availability'
      
      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body)['data']
      items = data['items']
      
      expect(items.length).to eq(8) # シードデータで8件の材料が存在
      
      # 材料1: 障子紙（強化）
      material1_data = items.find { |i| i['id'] == @material1.id }
      expect(material1_data).to be_present
      expect(material1_data['currentQty']).to eq(@material1.current_qty)
      expect(material1_data['committedQty']).to eq(Inventory::CalculateCommittedService.call[@material1.id] || 0)
      expect(material1_data['availableQty']).to eq(@material1.current_qty - (Inventory::CalculateCommittedService.call[@material1.id] || 0))
      
      # ステータスの確認
      available_qty = @material1.current_qty - (Inventory::CalculateCommittedService.call[@material1.id] || 0)
      expected_status = if available_qty < 0
        'shortage'
      elsif available_qty < @material1.threshold_qty
        'low'
      else
        'ok'
      end
      expect(material1_data['status']).to eq(expected_status)
      
      # 材料2: 網戸ネット
      material2_data = items.find { |i| i['id'] == @material2.id }
      expect(material2_data).to be_present
      expect(material2_data['currentQty']).to eq(@material2.current_qty)
      expect(material2_data['committedQty']).to eq(Inventory::CalculateCommittedService.call[@material2.id] || 0)
      expect(material2_data['availableQty']).to eq(@material2.current_qty - (Inventory::CalculateCommittedService.call[@material2.id] || 0))
      
      # 材料3: タタミ表
      material3_data = items.find { |i| i['id'] == @material3.id }
      expect(material3_data).to be_present
      expect(material3_data['currentQty']).to eq(@material3.current_qty)
      expect(material3_data['committedQty']).to eq(Inventory::CalculateCommittedService.call[@material3.id] || 0)
      expect(material3_data['availableQty']).to eq(@material3.current_qty - (Inventory::CalculateCommittedService.call[@material3.id] || 0))
    end

    it 'order=available.ascで利用可能が少ない順にソートされる' do
      get '/api/materials/availability?order=available.asc'
      
      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body)['data']
      items = data['items']
      
      # 利用可能が少ない順（負数が最初）
      expect(items[0]['availableQty']).to be < 0 # 不足材料が最初
      expect(items[0]['availableQty']).to be <= items[1]['availableQty'] # 昇順
    end

    it 'order=available.descで利用可能が多い順にソートされる' do
      get '/api/materials/availability?order=available.desc'
      
      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body)['data']
      items = data['items']
      
      # 利用可能が多い順
      expect(items[0]['availableQty']).to be > items[1]['availableQty']
      expect(items[1]['availableQty']).to be > items[2]['availableQty']
    end

    it 'order=name.ascで名称の昇順でソートされる' do
      get '/api/materials/availability?order=name.asc'
      
      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body)['data']
      items = data['items']
      
      # 名称の昇順
      expect(items[0]['name']).to be < items[1]['name']
      expect(items[1]['name']).to be < items[2]['name']
    end

    it 'limitパラメータで件数制限される' do
      get '/api/materials/availability?limit=2'
      
      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body)['data']
      items = data['items']
      
      expect(items.length).to eq(2)
    end

    it 'デフォルトでavailable.ascでソートされる' do
      get '/api/materials/availability'
      
      expect(response).to have_http_status(:ok)
      data = JSON.parse(response.body)['data']
      items = data['items']
      
      # 利用可能が少ない順（デフォルト）
      expect(items[0]['availableQty']).to be <= items[1]['availableQty']
      expect(items[1]['availableQty']).to be <= items[2]['availableQty']
    end
  end
end
