module Api
    class TasksController < Api::BaseController
      # GET /api/tasks?order=due.asc|due.desc&limit=500&status=pending|done|all
      def index
        order = params[:order].presence || "due.asc"
        status_filter = params[:status].presence || "all"
        
        # ベースクエリ：N+1回避のためincludesを使用
        rel = Task.includes(:task_materials, project: :customer)
          .joins(:project)
          .where(projects: { status: %w[in_progress delivery_scheduled] })

        # ステータスフィルタリング
        case status_filter
        when "pending"
          rel = rel.where.not(status: "done")
        when "done"
          rel = rel.where(status: "done")
        when "all"
          # 全ステータスを対象とする（フィルタなし）
        else
          # 無効なstatusパラメータの場合はpendingをデフォルトとする
          rel = rel.where.not(status: "done")
        end

        # 並び順
        rel = case order
        when "due.desc" then rel.order(Arel.sql("tasks.due_on DESC NULLS LAST"))
        else                   rel.order(Arel.sql("tasks.due_on ASC NULLS LAST"))
        end

        # 件数制限
        limit = [ (params[:limit] || 500).to_i, 500 ].min
        items = rel.limit(limit).map { |t| serialize(t) }

        render_ok(data: { items: items })
      end

      private

      def serialize(t)
        {
          id: t.id,
          projectId: t.project_id,
          title: t.title,
          status: t.status,
          # UIでは日付ラベル用途なので YYYY-MM-DD を返す
          dueOn: t.due_on&.strftime("%Y-%m-%d"),
          customerName: t.project&.customer&.name,
          materials: t.task_materials.map do |tm|
            {
              materialName: tm.material_name.presence || tm.material&.name,
              qtyPlanned: tm.qty_planned&.to_f
            }
          end
        }
      end
    end
end
