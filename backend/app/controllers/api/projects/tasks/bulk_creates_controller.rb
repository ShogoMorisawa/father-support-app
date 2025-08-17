class Api::Projects::Tasks::BulkCreatesController < Api::BaseController
  def create
    items = params.require(:items)
    delivery_on = params.require(:deliveryOn)
    result = ::Projects::Tasks::BulkCreateService.call(project_id: params[:project_id], items: items, delivery_on: delivery_on)
    if result.ok
      d = result.deliveries.first
      render_ok(data: {
        projectId: result.project.id,
        delivery: { id: d.id, date: d.date.to_s, status: d.status, title: d.title },
        tasks: result.tasks.map { |t| { id: t.id, title: t.title, dueOn: t.due_on&.to_s } }
      })
    else
      render_error(code: result.error_code || "invalid", message: result.error_message, status: (result.error_code == "not_found" ? 404 : 422))
    end
  end
end
