module Api
  class PhotosController < ApplicationController
    include RequireIdempotency

    # POST /api/photos/presign
    def presign
      p = params.permit(:fileName, :contentType, :byteSize, :scope, :projectId, :projectItemId)
      res = ::Photos::PresignService.call(
        file_name: p[:fileName],
        content_type: p[:contentType],
        byte_size: p[:byteSize],
        scope: p[:scope],
        project_id: p[:projectId],
        project_item_id: p[:projectItemId]
      )
      if res.ok
        render json: { ok: true, data: { url: res.url, method: "PUT", headers: res.headers, key: res.key } }
      else
        render json: { ok: false, error: { code: res.error_code, message: res.error_message } }, status: 422
      end
    end

    # POST /api/photos/attach
    def attach
      p = params.permit(:projectId, :projectItemId, :kind, :blobKey, :contentType, :byteSize)
      res = ::Photos::AttachService.call(
        project_id: p[:projectId],
        kind: p[:kind],
        blob_key: p[:blobKey],
        content_type: p[:contentType],
        byte_size: p[:byteSize]
      )
      if res.ok
        render json: { ok: true, data: { photo: { id: res.photo.id, key: res.photo.key, kind: res.photo.kind } } }
      else
        code = (res.error_code == "not_found") ? 404 : 422
        render json: { ok: false, error: { code: res.error_code, message: res.error_message } }, status: code
      end
    end

    # POST /api/photos/detach  （Undo用・Idempotency必須）
    def detach
      p = params.permit(:photoId)
      photo = ::ProjectPhoto.find(p[:photoId])

      ActiveRecord::Base.transaction do
        ::AuditLog.create!(
          action: "photo.detach",
          target_type: "project",
          target_id: photo.project_id,
          summary: "写真を削除（#{photo.kind}）",
          inverse: {
            method: "POST",
            path: "/api/photos/attach",
            payload: {
              projectId: photo.project_id,
              kind: photo.kind,
              blobKey: photo.key,
              contentType: photo.content_type,
              byteSize: photo.byte_size
            }
          }
        )
        photo.destroy!
      end

      render json: { ok: true, data: {} }
    rescue ActiveRecord::RecordNotFound
      render json: { ok: false, error: { code: "not_found", message: "写真が見つかりません。" } }, status: 404
    end
  end
end
