class Api::ProjectsController < ApplicationController
  def index
    limit = params[:limit].to_i
    limit = 50 if limit <= 0 || limit > 200

    order = params[:order].presence || "updated.desc"
    order_sql =
      case order
      when "updated.asc" then "projects.updated_at ASC"
      when "updated.desc" then "projects.updated_at DESC"
      else "projects.updated_at DESC"
      end

    rel = Project.includes(:customer).all
    if params[:status].present?
      rel = rel.where(status: params[:status])
    end

    # 期間はとりあえず due_on 基準（completed_at 追加後は差し替え）
    from_d = parse_date(params[:from]) if params[:from].present?
    to_d   = parse_date(params[:to])   if params[:to].present?
    rel = rel.where("due_on >= ?", from_d) if from_d
    rel = rel.where("due_on <= ?", to_d)   if to_d

    items = rel.order(order_sql).limit(limit).map do |p|
      {
        id: p.id,
        title: p.title,
        status: p.status,
        dueOn: p.due_on,
        customerName: p.customer&.name
      }
    end

    render json: { ok: true, data: { items: items } }
  rescue ArgumentError => e
    render json: { ok: false, error: { code: "invalid", message: e.message } }, status: 422
  end

  private

  def parse_date(s)
    Date.parse(s.to_s)
  end
end
