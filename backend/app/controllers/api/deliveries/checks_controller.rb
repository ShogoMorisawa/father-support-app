class Api::Deliveries::ChecksController < Api::BaseController
  include RequireIdempotency

  def create
    d = ::Delivery.find(params[:id])
    t = ::Task.where(project_id: d.project_id, id: params[:taskId]).first
    return render_error(code: "not_found", message: "タスクが見つかりません。", status: 404) unless t

    prepared = ActiveModel::Type::Boolean.new.cast(params[:prepared])
    t.update!(prepared_at: prepared ? Time.current : nil)

    ::AuditLog.create!(
      action: "delivery.check",
      target_type: "delivery",
      target_id: d.id,
      summary: "納品チェック: #{t.title} を#{prepared ? '準備済み' : '未準備'}",
      inverse: {
        method: "POST",
        path: "/api/deliveries/#{d.id}/check",
        payload: { taskId: t.id, prepared: !prepared }
      }
    )

    tasks = ::Task.where(project_id: d.project_id).order(:id)
    render_ok(data: {
      delivery: { id: d.id, projectId: d.project_id, date: d.date&.to_s, status: d.status, title: d.title, customerName: d.project&.customer&.name },
      tasks: tasks.map { |x| { id: x.id, title: x.title, preparedAt: x.prepared_at&.iso8601,
        materials: x.task_materials.map { |m| { materialName: m.material_name.presence || m.material&.name || "", qtyPlanned: m.qty_planned&.to_f } } } },
      allPrepared: tasks.all? { |x| x.prepared_at.present? }
    })
  rescue ActiveRecord::RecordNotFound
    render_error(code: "not_found", message: "納品が見つかりません。", status: 404)
  end
end
