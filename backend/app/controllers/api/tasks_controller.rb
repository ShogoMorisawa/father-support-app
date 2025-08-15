module Api
    class TasksController < Api::BaseController
      # GET /api/tasks?order=due.asc|due.desc
      def index
        order = params[:order].presence || "due.asc"
        rel = Task.includes(project: :customer)
  
        rel = case order
              when "due.desc" then rel.order(Arel.sql("tasks.due_on DESC NULLS LAST"))
              else                   rel.order(Arel.sql("tasks.due_on ASC NULLS LAST"))
              end
  
        limit = [(params[:limit] || 200).to_i, 500].min
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
          address: t.project&.customer&.address
        }
      end
    end
  end
  