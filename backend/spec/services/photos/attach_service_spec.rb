require 'rails_helper'

RSpec.describe Photos::AttachService do
  let(:project) { create(:project) }
  let(:kind) { 'before' }
  let(:blob_key) { 'uploads/projects/123/2025/08/test-key.jpg' }
  let(:content_type) { 'image/jpeg' }
  let(:byte_size) { 1024 * 1024 } # 1MB

  describe '.call' do
    context '正常なパラメータの場合' do
      it '写真を作成し、成功レスポンスを返す' do
        result = described_class.call(
          project_id: project.id,
          kind: kind,
          blob_key: blob_key,
          content_type: content_type,
          byte_size: byte_size
        )

        expect(result.ok).to be true
        expect(result.photo).to be_present
        expect(result.photo.project_id).to eq(project.id)
        expect(result.photo.kind).to eq(kind)
        expect(result.photo.key).to eq(blob_key)
        expect(result.photo.content_type).to eq(content_type)
        expect(result.photo.byte_size).to eq(byte_size)
        expect(result.error_code).to be_nil
        expect(result.error_message).to be_nil
      end

      it '監査ログを作成する' do
        expect {
          described_class.call(
            project_id: project.id,
            kind: kind,
            blob_key: blob_key,
            content_type: content_type,
            byte_size: byte_size
          )
        }.to change(AuditLog, :count).by(1)

        audit_log = AuditLog.last
        expect(audit_log.action).to eq('photo.attach')
        expect(audit_log.target_type).to eq('project')
        expect(audit_log.target_id).to eq(project.id)
        expect(audit_log.summary).to eq('写真を添付（before）')
      end
    end

    context '不正なkindの場合' do
      let(:kind) { 'invalid' }

      it 'エラーレスポンスを返す' do
        result = described_class.call(
          project_id: project.id,
          kind: kind,
          blob_key: blob_key
        )

        expect(result.ok).to be false
        expect(result.error_code).to eq('invalid')
        expect(result.error_message).to eq('kindが不正です。')
      end
    end

    context 'blob_keyが空の場合' do
      let(:blob_key) { '' }

      it 'エラーレスポンスを返す' do
        result = described_class.call(
          project_id: project.id,
          kind: kind,
          blob_key: blob_key
        )

        expect(result.ok).to be false
        expect(result.error_code).to eq('invalid')
        expect(result.error_message).to eq('blobKeyが不正です。')
      end
    end

    context '許可されていないContent-Typeの場合' do
      let(:content_type) { 'application/pdf' }

      it 'エラーレスポンスを返す' do
        result = described_class.call(
          project_id: project.id,
          kind: kind,
          blob_key: blob_key,
          content_type: content_type,
          byte_size: byte_size
        )

        expect(result.ok).to be false
        expect(result.error_code).to eq('invalid_type')
        expect(result.error_message).to eq('許可されていないファイル形式です。')
      end
    end

    context '存在しないプロジェクトIDの場合' do
      it 'エラーレスポンスを返す' do
        result = described_class.call(
          project_id: 99999,
          kind: kind,
          blob_key: blob_key
        )

        expect(result.ok).to be false
        expect(result.error_code).to eq('not_found')
        expect(result.error_message).to eq('案件が見つかりません。')
      end
    end

    context 'kindがnilの場合' do
      it 'デフォルトでotherが設定される' do
        result = described_class.call(
          project_id: project.id,
          kind: nil,
          blob_key: blob_key
        )

        expect(result.ok).to be true
        expect(result.photo.kind).to eq('other')
      end
    end

    context 'kindが空文字の場合' do
      it 'デフォルトでotherが設定される' do
        result = described_class.call(
          project_id: project.id,
          kind: '',
          blob_key: blob_key
        )

        expect(result.ok).to be true
        expect(result.photo.kind).to eq('other')
      end
    end
  end

  describe 'ALLOWED_CONTENT_TYPES' do
    it '許可された画像形式を含む' do
      expect(described_class::ALLOWED_CONTENT_TYPES).to include(
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      )
    end
  end
end

