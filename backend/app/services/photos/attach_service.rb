module Photos
  class AttachService
    Result = Struct.new(:ok, :photo, :error_code, :error_message, keyword_init: true)

    def self.call(project_id:, kind:, blob_key:, content_type: nil, byte_size: nil)
      new(project_id:, kind:, blob_key:, content_type:, byte_size:).call
    end

    def initialize(project_id:, kind:, blob_key:, content_type:, byte_size:)
      @project_id   = project_id.to_i
      @kind         = (kind.presence || "other").to_s
      @blob_key     = blob_key.to_s
      @content_type = content_type
      @byte_size    = byte_size
    end

    def call
      raise ActiveRecord::RecordNotFound unless ::Project.exists?(@project_id)
      return err!("invalid", "blobKeyが不正です。") if @blob_key.blank?
      return err!("invalid", "kindが不正です。")     unless ProjectPhoto::KINDS.include?(@kind)

      photo = nil
      ActiveRecord::Base.transaction do
        photo = ::ProjectPhoto.create!(
          project_id: @project_id,
          kind: @kind,
          key: @blob_key,
          content_type: @content_type,
          byte_size: @byte_size
        )

        ::AuditLog.create!(
          action: "photo.attach",
          target_type: "project",
          target_id: @project_id,
          summary: "写真を添付（#{@kind}）",
          inverse: {
            method: "POST",
            path: "/api/photos/detach",
            payload: { photoId: photo.id }
          }
        )
      end

      Result.new(ok: true, photo: photo)
    rescue ActiveRecord::RecordNotFound
      err!("not_found", "案件が見つかりません。")
    rescue ActiveRecord::RecordInvalid => e
      err!("invalid", e.record.errors.full_messages.join(", "))
    end

    private

    def err!(code, msg)
      Result.new(ok: false, error_code: code, error_message: msg)
    end
  end
end
