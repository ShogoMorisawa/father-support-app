require 'rails_helper'

RSpec.describe 'Materials Availability API', type: :request do
  let!(:material1) { create(:material, name: '障子紙', current_qty: 10.0, threshold_qty: 2.0, unit: '枚') }
  let!(:material2) { create(:material, name: '糊', current_qty: 3.0, threshold_qty: 5.0, unit: '本') }
  let!(:material3) { create(:material, name: '枠材', current_qty: 1.0, threshold_qty: 2.0, unit: '本') }
  let!(:project) { create(:project) }

  before do
    # 予定消費を設定
    task1 = create(:task, project: project, status: 'todo')
    task2 = create(:task, project: project, status: 'doing')
    
    # material1: 10.0 - 3.0 = 7.0 (ok)
    create(:task_material, task: task1, material: material1, qty_used: 2.0, qty_planned: 1.0)
    create(:task_material, task: task2, material: material1, qty_used: nil, qty_planned: 1.0)
    
    # material2: 3.0 - 1.5 = 1.5 (low, threshold=5.0)
    create(:task_material, task: task1, material: material2, qty_used: 1.5, qty_planned: 2.0)
    
    # material3: 1.0 - 2.0 = -1.0 (shortage)
    create(:task_material, task: task1, material: material3, qty_used: 2.0, qty_planned: 1.0)
  end

  describe 'GET /api/materials/availability' do
    it '材料の在庫可用性情報を返す' do
      get '/api/materials/availability'

      expect(response).to have_http_status(:ok)
      
      json = JSON.parse(response.body)
      expect(json['ok']).to be true
      expect(json['data']['items']).to be_an(Array)
      expect(json['data']['items'].length).to eq(3)

      items = json['data']['items']
      
      # material1: 在庫十分
      item1 = items.find { |i| i['name'] == '障子紙' }
      expect(item1).to include(
        'id' => material1.id,
        'name' => '障子紙',
        'unit' => '枚',
        'currentQty' => 10.0,
        'committedQty' => 3.0, # 2.0 + 1.0
        'availableQty' => 7.0,
        'thresholdQty' => 2.0,
        'status' => 'ok'
      )

      # material2: 在庫少
      item2 = items.find { |i| i['name'] == '糊' }
      expect(item2).to include(
        'id' => material2.id,
        'name' => '糊',
        'unit' => '本',
        'currentQty' => 3.0,
        'committedQty' => 1.5,
        'availableQty' => 1.5,
        'thresholdQty' => 5.0,
        'status' => 'low'
      )

      # material3: 在庫不足
      item3 = items.find { |i| i['name'] == '枠材' }
      expect(item3).to include(
        'id' => material3.id,
        'name' => '枠材',
        'unit' => '本',
        'currentQty' => 1.0,
        'committedQty' => 2.0,
        'availableQty' => -1.0,
        'thresholdQty' => 2.0,
        'status' => 'shortage'
      )
    end

    context '材料が存在しない場合' do
      before do
        TaskMaterial.destroy_all
        Task.destroy_all
        Project.destroy_all
        Material.destroy_all
      end

      it '空の配列を返す' do
        get '/api/materials/availability'

        expect(response).to have_http_status(:ok)
        
        json = JSON.parse(response.body)
        expect(json['data']['items']).to eq([])
      end
    end

    context '予定消費がない場合' do
      before { TaskMaterial.destroy_all }

      it 'committedQty が 0 になる' do
        get '/api/materials/availability'

        expect(response).to have_http_status(:ok)
        
        json = JSON.parse(response.body)
        items = json['data']['items']
        
        items.each do |item|
          expect(item['committedQty']).to eq(0.0)
          expect(item['availableQty']).to eq(item['currentQty'])
        end
      end
    end
  end
end
