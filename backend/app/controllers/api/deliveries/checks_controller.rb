module Api
  module Deliveries
    class ChecksController < ApplicationController
      include RequireIdempotency

      def create
        ActiveRecord::Base.transaction do
          delivery = ::Delivery.lock.find(params[:id])
          task_id  = params.require(:taskId)
          prepared = ActiveModel::Type::Boolean.new.cast(params.require(:prepared))

          task = ::Task.lock.find(task_id)
          # 紐づき安全確認（同一プロジェクト配下）
          if task.project_id != delivery.project_id
            render json: { ok: false, error: { code: "invalid", message: "タスクが納品に一致しません。" } }, status: 422 and return
          end

          if prepared
            # まだ done でなければ完了（在庫減算）
            if task.status != "done"
              res = ::Tasks::CompleteService.call(task_id: task.id)
              unless res.ok
                render json: { ok: false, error: { code: res.error_code, message: res.error_message } }, status: (res.error_code == "conflict" ? 409 : 422) and return
              end
              # CompleteService後にタスクを再読み込み
              task.reload
            end
            # prepared_at を設定（既に完了済みの場合は現在時刻を設定）
            task.update!(prepared_at: Time.current)
          else
            # まだ done なら取り消し（在庫復元）
            if task.status == "done"
              res = ::Tasks::RevertCompleteService.call(task_id: task.id)
              unless res.ok
                render json: { ok: false, error: { code: res.error_code, message: res.error_message } }, status: (res.error_code == "conflict" ? 409 : 422) and return
              end
              # RevertCompleteService後にタスクを再読み込み
              task.reload
            end
            task.update!(prepared_at: nil)
          end

          tasks = ::Task.where(project_id: delivery.project_id, due_on: delivery.date).includes(:task_materials).order(:id)
          render json: {
            ok: true,
            data: {
              delivery: {
                id: delivery.id,
                projectId: delivery.project_id,
                date: delivery.date.to_s,
                status: delivery.status,
                title: delivery.title,
                customerName: delivery.project.customer.name
              },
              tasks: tasks.map { |t|
                {
                  id: t.id,
                  title: t.title,
                  status: t.status,
                  preparedAt: t.prepared_at,
                  materials: t.task_materials.map { |tm|
                    { materialId: tm.material_id, materialName: tm.material_name, qtyPlanned: tm.qty_planned }
                  }
                }
              },
              # 「準備済み かつ done」が全件そろったら true
              allPrepared: tasks.present? && tasks.all? { |t| t.prepared_at.present? && t.status == "done" }
            }
          }
        end
      rescue ActionController::ParameterMissing => e
        render json: { ok: false, error: { code: "invalid", message: e.message } }, status: 422
      rescue ActiveRecord::RecordNotFound
        render json: { ok: false, error: { code: "not_found", message: "対象が見つかりません。" } }, status: 404
      end
    end
  end
end
