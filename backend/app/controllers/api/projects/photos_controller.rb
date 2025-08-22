module Api
  module Projects
    class PhotosController < ApplicationController
      def index
        project = ::Project.find(params[:project_id])
        photos = ::ProjectPhoto.where(project_id: project.id).order(created_at: :desc)
        items = photos.map { |ph| { id: ph.id, kind: ph.kind, key: ph.key, createdAt: ph.created_at } }
        render json: { ok: true, data: { items: items } }
      rescue ActiveRecord::RecordNotFound
        render json: { ok: false, error: { code: "not_found", message: "案件が見つかりません。" } }, status: 404
      end

      def destroy
        project = Project.find(params[:project_id])
        photo   = project.photos.find(params[:id])
        photo.destroy!
        AuditLog.create!(
          action: "photo.delete",
          target_type: "project",
          target_id: project.id,
          summary: "写真削除（#{photo.kind}）",
          inverse: {
            method: "POST",
            path: "/api/photos/attach",
            payload: { projectId: project.id, projectItemId: photo.project_item_id, kind: photo.kind, blobKey: photo.blob_key }
          }
        )
        render json: { ok: true, data: {} }
      rescue ActiveRecord::RecordNotFound
        render json: { ok: false, error: { code: "not_found", message: "対象が見つかりません。" } }, status: 404
      end
    end
  end
end
