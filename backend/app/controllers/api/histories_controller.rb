module Api
    class HistoriesController < Api::BaseController
      def index
        limit = [ (params[:limit] || 10).to_i, 100 ].min
        logs = AuditLog.order(created_at: :desc).limit(limit)
        
        # project_idフィルターを追加
        if params[:project_id].present?
          logs = logs.where(target_type: "Project", target_id: params[:project_id])
        end

        items = logs.map do |l|
          can_undo = compute_can_undo(l)
          {
            id: l.id,
            action: l.action,
            targetType: l.target_type,
            targetId: l.target_id,
            summary: l.summary,
            createdAt: l.created_at.iso8601,
            inverse: l.inverse,        # {method, path, payload}
            canUndo: can_undo
          }
        end

        render_ok(data: { items: items })
      end

      private

      def compute_can_undo(log)
        return false if log.inverse.blank?
        if log.action == "project.complete"
          Project.find_by(id: log.target_id)&.completed?
        elsif log.action == "project.revert_complete"
          # 取り消し後にまた完了できる状態（=未完了）
          prj = Project.find_by(id: log.target_id)
          prj.present? && !prj.completed?
        elsif log.action == "deliveries.bulk_shift"
          true
        else
          false
        end
      rescue
        false
      end
    end
end
