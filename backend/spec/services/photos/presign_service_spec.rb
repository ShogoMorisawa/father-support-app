require 'rails_helper'

RSpec.describe Photos::PresignService do
  let(:project) { create(:project) }
  let(:file_name) { 'test.jpg' }
  let(:content_type) { 'image/jpeg' }
  let(:byte_size) { 1024 * 1024 } # 1MB
  let(:scope) { 'project' }
  let(:project_id) { project.id }

  before do
    # 環境変数の設定
    ENV['S3_BUCKET'] = 'test-bucket'
    ENV['AWS_REGION'] = 'ap-northeast-1'
    ENV['AWS_ACCESS_KEY_ID'] = 'test-key'
    ENV['AWS_SECRET_ACCESS_KEY'] = 'test-secret'
  end

  after do
    # 環境変数をクリア
    ENV.delete('S3_BUCKET')
    ENV.delete('AWS_REGION')
    ENV.delete('AWS_ACCESS_KEY_ID')
    ENV.delete('AWS_SECRET_ACCESS_KEY')
  end

  describe '.call' do
    context '正常なパラメータの場合' do
      it '成功レスポンスを返す' do
        # AWS SDKのモック
        mock_client = instance_double(Aws::S3::Client)
        mock_signer = instance_double(Aws::S3::Presigner)
        mock_url = 'https://test-bucket.s3.amazonaws.com/test-key'
        
        allow(Aws::S3::Client).to receive(:new).and_return(mock_client)
        allow(Aws::S3::Presigner).to receive(:new).and_return(mock_signer)
        allow(mock_signer).to receive(:presigned_url).and_return(mock_url)

        result = described_class.call(
          file_name: file_name,
          content_type: content_type,
          byte_size: byte_size,
          scope: scope,
          project_id: project_id
        )

        expect(result.ok).to be true
        expect(result.url).to eq(mock_url)
        expect(result.key).to be_present
        expect(result.error_code).to be_nil
        expect(result.error_message).to be_nil
      end
    end

    context '不正なscopeの場合' do
      let(:scope) { 'invalid' }

      it 'エラーレスポンスを返す' do
        result = described_class.call(
          file_name: file_name,
          content_type: content_type,
          byte_size: byte_size,
          scope: scope,
          project_id: project_id
        )

        expect(result.ok).to be false
        expect(result.error_code).to eq('invalid_scope')
        expect(result.error_message).to eq('scopeは\'project\'のみ対応しています。')
      end
    end

    context 'ファイルサイズが大きすぎる場合' do
      let(:byte_size) { 20 * 1024 * 1024 } # 20MB

      it 'エラーレスポンスを返す' do
        result = described_class.call(
          file_name: file_name,
          content_type: content_type,
          byte_size: byte_size,
          scope: scope,
          project_id: project_id
        )

        expect(result.ok).to be false
        expect(result.error_code).to eq('too_large')
        expect(result.error_message).to eq('ファイルサイズが大きすぎます。')
      end
    end

    context '許可されていないContent-Typeの場合' do
      let(:content_type) { 'application/pdf' }

      it 'エラーレスポンスを返す' do
        result = described_class.call(
          file_name: file_name,
          content_type: content_type,
          byte_size: byte_size,
          scope: scope,
          project_id: project_id
        )

        expect(result.ok).to be false
        expect(result.error_code).to eq('invalid_type')
        expect(result.error_message).to eq('許可されていないファイル形式です。')
      end
    end

    context '存在しないプロジェクトIDの場合' do
      let(:project_id) { 99999 }

      it 'エラーレスポンスを返す' do
        result = described_class.call(
          file_name: file_name,
          content_type: content_type,
          byte_size: byte_size,
          scope: scope,
          project_id: project_id
        )

        expect(result.ok).to be false
        expect(result.error_code).to eq('not_found')
        expect(result.error_message).to eq('案件が見つかりません。')
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

  describe 'MAX_BYTES' do
    it 'デフォルトで10MBに設定されている' do
      expect(described_class::MAX_BYTES).to eq(10 * 1024 * 1024)
    end
  end
end
