require 'rails_helper'

RSpec.describe 'Api::Estimates', type: :request do
  let!(:customer) { create(:customer, name: 'テスト顧客', phone: '090-1234-5678', address: '東京都渋谷区') }
  let!(:estimate) { create(:estimate, customer: customer, scheduled_at: Time.current) }

  describe 'GET /api/estimates/:id' do
    context '存在する見積の場合' do
      let!(:material) { create(:material, name: '障子紙', unit: '枚') }
      let!(:estimate_item) do
        create(:estimate_item, 
          estimate: estimate, 
          material: material, 
          material_name: '障子紙', 
          qty: 5.0, 
          category: '障子', 
          unit: '枚'
        )
      end

      it '見積詳細と明細を返す' do
        get "/api/estimates/#{estimate.id}"

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        
        expect(json['data']['estimate']['id']).to eq(estimate.id)
        expect(json['data']['estimate']['customer']['name']).to eq('テスト顧客')
        expect(json['data']['estimate']['customer']['phone']).to eq('090-1234-5678')
        expect(json['data']['estimate']['customer']['address']).to eq('東京都渋谷区')
        
        expect(json['data']['items'].length).to eq(1)
        item = json['data']['items'].first
        expect(item['materialId']).to eq(material.id)
        expect(item['materialName']).to eq('障子紙')
        expect(item['category']).to eq('障子')
        expect(item['qty']).to eq("5.0")
        expect(item['unit']).to eq('枚')
        expect(item['position']).to eq(0)
      end
    end

    context '存在しない見積の場合' do
      it '404エラーを返す' do
        get "/api/estimates/999999"

        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'PATCH /api/estimates/:id/items' do
    let(:valid_items) do
      [
        {
          materialId: nil,
          materialName: '障子紙',
          category: '障子',
          qty: 5.0,
          unit: '枚',
          position: 0
        },
        {
          materialId: nil,
          materialName: '網戸ネット',
          category: '網戸',
          qty: 2.0,
          unit: '枚',
          position: 1
        }
      ]
    end

    context '有効な明細データの場合' do
      it '明細を更新し、成功レスポンスを返す' do
        patch "/api/estimates/#{estimate.id}/items", 
          params: { items: valid_items },
          headers: { 'X-Idempotency-Key' => 'test-key-123' }

        puts "Response status: #{response.status}"
        puts "Response body: #{response.body}"
        
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['data']['message']).to eq('明細を更新しました')
        expect(json['data']['itemsCount']).to eq(2)

        # データベースに保存されているか確認
        estimate.reload
        expect(estimate.estimate_items.count).to eq(2)
        
        first_item = estimate.estimate_items.find_by(position: 0)
        expect(first_item.material_name).to eq('障子紙')
        expect(first_item.category).to eq('障子')
        expect(first_item.qty).to eq(5.0)
        expect(first_item.unit).to eq('枚')
      end
    end

    context '無効な明細データの場合' do
      let(:invalid_items) do
        [
          {
            materialName: '', # 空文字は無効
            qty: 5.0
          }
        ]
      end

      it 'バリデーションエラーを返す' do
        patch "/api/estimates/#{estimate.id}/items", 
          params: { items: invalid_items },
          headers: { 'X-Idempotency-Key' => 'test-key-456' }

        puts "Error response status: #{response.status}"
        puts "Error response body: #{response.body}"
        
        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        expect(json['error']['message']).to include('Material name')
      end
    end

    context '存在しない見積の場合' do
      it '404エラーを返す' do
        patch "/api/estimates/999999/items", 
          params: { items: valid_items },
          headers: { 'X-Idempotency-Key' => 'test-key-789' }

        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'GET /api/estimates?withStock=1' do
    context '明細がある見積の場合' do
      let!(:material) { create(:material, name: '障子紙', current_qty: 10.0, unit: '枚') }
      let!(:estimate_item) do
        create(:estimate_item, 
          estimate: estimate, 
          material: material, 
          material_name: '障子紙', 
          qty: 5.0
        )
      end

      it '在庫情報を含む見積一覧を返す' do
        get "/api/estimates?withStock=1"

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        
        estimate_data = json['data']['items'].find { |item| item['id'] == estimate.id }
        expect(estimate_data['hasItems']).to be true
        expect(estimate_data['stockPreview']['mode']).to be_nil
        expect(estimate_data['stockPreview']['overallStatus']).to eq('ok')
      end
    end

    context '明細がない見積の場合' do
      it '在庫バナーを出さない' do
        get "/api/estimates?withStock=1"

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        
        estimate_data = json['data']['items'].find { |item| item['id'] == estimate.id }
        expect(estimate_data['hasItems']).to be false
        expect(estimate_data['stockPreview']['mode']).to eq('not_applicable')
      end
    end
  end
end
