module Photos
  class PresignService
    Result = Struct.new(:ok, :url, :headers, :key, :error_code, :error_message, keyword_init: true)

    MAX_BYTES = (ENV["PHOTO_MAX_BYTES"] || 10 * 1024 * 1024).to_i # 既定10MB
    
    # 許可する画像形式
    ALLOWED_CONTENT_TYPES = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ].freeze

    def self.call(file_name:, content_type:, byte_size:, scope:, project_id:, project_item_id: nil)
      new(file_name:, content_type:, byte_size:, scope:, project_id:, project_item_id:).call
    end

    def initialize(file_name:, content_type:, byte_size:, scope:, project_id:, project_item_id:)
      @file_name = file_name.to_s
      @content_type = content_type.to_s
      @byte_size = byte_size.to_i
      @scope = scope.to_s
      @project_id = project_id.to_i
      @project_item_id = project_item_id
    end

    def call
      return err!("invalid_scope", "scopeは'project'のみ対応しています。") unless @scope == "project"
      return err!("too_large", "ファイルサイズが大きすぎます。") if @byte_size <= 0 || @byte_size > MAX_BYTES
      return err!("invalid_type", "許可されていないファイル形式です。") unless ALLOWED_CONTENT_TYPES.include?(@content_type)

      project = ::Project.find(@project_id)

      key = build_key(@file_name, project.id)
      url, headers = presign_put_url(key, @content_type)

      Result.new(ok: true, url:, headers:, key:)
    rescue ActiveRecord::RecordNotFound
      err!("not_found", "案件が見つかりません。")
    rescue => e
      err!("error", e.message)
    end

    private

    def build_key(file_name, project_id)
      base = File.basename(file_name.to_s)
      # 拡張子は維持しつつ、ファイル名は安全化
      ext  = File.extname(base).downcase
      stem = base.sub(/#{Regexp.escape(ext)}\z/i, "")
      safe = stem.parameterize(separator: "_")
      uuid = SecureRandom.uuid
      # 例: uploads/projects/123/2025/08/uuid_safe-name.jpg
      t = Time.now.utc
      "uploads/projects/#{project_id}/#{t.strftime("%Y/%m")}/#{uuid}_#{safe}#{ext}"
    end

    def presign_put_url(key, content_type)
      bucket = ENV["S3_BUCKET"] or raise "S3_BUCKET is not set"
      opts = {
        region: ENV["AWS_REGION"] || ENV["S3_REGION"],
        access_key_id: ENV["AWS_ACCESS_KEY_ID"],
        secret_access_key: ENV["AWS_SECRET_ACCESS_KEY"]
      }.compact

      # MinIO等の互換エンドポイント対応
      if ENV["S3_ENDPOINT"].present?
        opts[:endpoint] = ENV["S3_ENDPOINT"]
        opts[:force_path_style] = ENV["S3_FORCE_PATH_STYLE"] == "true"
      end

      client = Aws::S3::Client.new(**opts)
      signer = Aws::S3::Presigner.new(client:)
      url = signer.presigned_url(
        :put_object,
        bucket: bucket,
        key: key,
        expires_in: (ENV["S3_PRESIGN_EXPIRES"] || 300).to_i, # 5分に短縮
        content_type: content_type.presence
      )
      headers = {}
      headers["Content-Type"] = content_type if content_type.present?
      [url, headers]
    end

    def err!(code, msg)
      Result.new(ok: false, error_code: code, error_message: msg)
    end
  end
end
