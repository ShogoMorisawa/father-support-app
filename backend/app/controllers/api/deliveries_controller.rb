module Api
    class DeliveriesController < Api::BaseController
      def index
        status = params[:status].presence || "pending" # pending | all
        order  = params[:order].presence  || "date.asc"

        rel = Delivery.includes(:project)
        rel = rel.where(status: "pending") unless status == "all"

        rel = case order
        when "date.desc" then rel.order(date: :desc)
        else                   rel.order(date: :asc)
        end

        items = rel.limit((params[:limit] || 200).to_i).map do |d|
          {
            id: d.id,
            projectId: d.project_id,
            date: d.date,
            status: d.status,
            title: d.title,
            customerName: d.project.customer.name
          }
        end

        render_ok(data: { items: items })
      end
    end
end
