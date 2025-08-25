module Api
  module Projects
    class DatesController < Api::BaseController
      def update
        project = Project.includes(:deliveries).find(params[:project_id])
        
        # パラメータの取得
        project_due_on = params[:projectDueOn].presence
        delivery_on = params[:deliveryOn].presence
        reason = params[:reason].presence
        
        # 変更前の値を記録
        old_project_due_on = project.due_on
        old_delivery_date = project.deliveries.first&.date
        
        # 監査ログ用の変更内容を構築
        changes = []
        changes << "案件: #{old_project_due_on} → #{project_due_on}" if project_due_on && project_due_on != old_project_due_on
        changes << "納品: #{old_delivery_date} → #{delivery_on}" if delivery_on && delivery_on != old_delivery_date
        
        # 理由を追加
        summary = "期日変更（#{changes.join(' / ')}）"
        summary += " - #{reason}" if reason
        
        return render json: { message: "変更がありません" } if changes.empty?
        
        ActiveRecord::Base.transaction do
          # 案件の期日を更新
          if project_due_on
            project.update!(due_on: Date.parse(project_due_on))
          end
          
          # 納品の期日を更新（最初の納品のみ）
          if delivery_on && project.deliveries.any?
            delivery = project.deliveries.first
            delivery.update!(date: Date.parse(delivery_on))
          end
          
          # 監査ログを記録
          AuditLog.create!(
            action: "update",
            target_type: "Project",
            target_id: project.id,
            summary: summary,
            correlation_id: request.request_id
          )
        end
        
        render json: { 
          message: "期日を更新しました",
          project: {
            dueOn: project.due_on&.to_s
          },
          delivery: project.deliveries.first ? {
            date: project.deliveries.first.date.to_s
          } : nil
        }
        
      rescue Date::Error
        render json: { error: "日付の形式が不正です" }, status: :unprocessable_entity
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end
