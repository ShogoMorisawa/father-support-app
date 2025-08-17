module Api
    class DeliveriesController < Api::BaseController
      def index
        status_in = params[:status].to_s
        status = %w[pending all].include?(status_in) ? status_in : "pending"
        order  = params[:order].to_s
        limit  = [[(params[:limit] || 200).to_i, 1].max, 500].min

        rel = Delivery.includes(project: :customer)
        rel = rel.where(status: "pending") unless status == "all"
        rel = (order == "date.desc") ? rel.order(date: :desc) : rel.order(date: :asc)
        rel = rel.limit(limit)

        items = rel.map { |d|
          {
            id: d.id,
            projectId: d.project_id,
            date: d.date&.to_s,
            status: d.status,
            title: d.title,
            customerName: d.project&.customer&.name
          }
        }
        render_ok(data: { items: items })
      end

      def show
        delivery = Delivery.includes(project: { customer: {}, tasks: :task_materials }).find(params[:id])
        
        render_ok(data: {
          id: delivery.id,
          projectId: delivery.project_id,
          date: delivery.date&.to_s,
          status: delivery.status,
          title: delivery.title,
          customerName: delivery.project&.customer&.name,
          customerAddress: delivery.project&.customer&.address,
          projectTitle: delivery.project&.title,
          projectDueOn: delivery.project&.due_on&.to_s,
          tasks: delivery.project&.tasks&.map { |t|
            {
              id: t.id,
              title: t.title,
              kind: t.kind,
              dueOn: t.due_on&.to_s,
              status: t.status,
              preparedAt: t.prepared_at&.to_s,
              materials: t.task_materials&.map { |tm|
                {
                  materialName: tm.material_name,
                  qtyPlanned: tm.qty_planned,
                  qtyUsed: tm.qty_used
                }
              }
            }
          }
        })
      end
    end
end
