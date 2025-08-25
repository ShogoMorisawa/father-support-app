require 'rails_helper'

RSpec.describe 'Api::Projects::Dates', type: :request do
  let(:project) { create(:project, due_on: Date.new(2025, 8, 25)) }
  # deliveryファクトリが存在しないため、直接作成
  let!(:delivery) do
    Delivery.create!(
      project: project,
      date: Date.new(2025, 8, 25),
      status: 'pending',
      title: 'テスト納品'
    )
  end

  describe 'PATCH /api/projects/:project_id/dates' do
    context '案件期日のみ変更' do
      it '案件期日を更新する' do
        patch "/api/projects/#{project.id}/dates", params: {
          projectDueOn: '2025-09-01'
        }

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['message']).to eq('期日を更新しました')
        expect(json['project']['dueOn']).to eq('2025-09-01')
        # APIは常に両方の情報を返す
        expect(json['delivery']).to be_present

        # 監査ログを確認
        audit_log = AuditLog.last
        expect(audit_log.summary).to eq('期日変更（案件: 2025-08-25 → 2025-09-01）')
      end
    end

    context '納品日のみ変更' do
      it '納品日を更新する' do
        patch "/api/projects/#{project.id}/dates", params: {
          deliveryOn: '2025-09-01'
        }

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['delivery']['date']).to eq('2025-09-01')
        # APIは常に両方の情報を返す
        expect(json['project']).to be_present

        # 監査ログを確認
        audit_log = AuditLog.last
        expect(audit_log.summary).to eq('期日変更（納品: 2025-08-25 → 2025-09-01）')
      end
    end

    context '両方変更' do
      it '案件期日と納品日を同時に更新する' do
        patch "/api/projects/#{project.id}/dates", params: {
          projectDueOn: '2025-09-01',
          deliveryOn: '2025-09-01'
        }

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['project']['dueOn']).to eq('2025-09-01')
        expect(json['delivery']['date']).to eq('2025-09-01')

        # 監査ログを確認
        audit_log = AuditLog.last
        expect(audit_log.summary).to eq('期日変更（案件: 2025-08-25 → 2025-09-01 / 納品: 2025-08-25 → 2025-09-01）')
      end
    end

    context '理由付きで変更' do
      it '理由と共に期日を更新する' do
        patch "/api/projects/#{project.id}/dates", params: {
          projectDueOn: '2025-09-01',
          reason: '顧客都合で延期'
        }

        expect(response).to have_http_status(:ok)
        
        # 監査ログを確認
        audit_log = AuditLog.last
        expect(audit_log.summary).to eq('期日変更（案件: 2025-08-25 → 2025-09-01） - 顧客都合で延期')
      end
    end

    context '変更なし' do
      it '変更がない場合はメッセージを返す' do
        patch "/api/projects/#{project.id}/dates", params: {}

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['message']).to eq('変更がありません')
      end
    end

    context '無効な日付' do
      it '無効な日付の場合はエラーを返す' do
        patch "/api/projects/#{project.id}/dates", params: {
          projectDueOn: 'invalid-date'
        }

        expect(response).to have_http_status(:unprocessable_entity)
        json = JSON.parse(response.body)
        expect(json['error']).to eq('日付の形式が不正です')
      end
    end
  end
end
