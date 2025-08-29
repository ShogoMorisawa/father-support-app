class Api::ProjectsController < Api::BaseController
  # GET /api/projects
  # params:
  #   status: "active" | "completed" | "all" (default: active)
  #   order:  "due.asc" | "due.desc" | "completed.desc" | "completed.asc" (default: due.asc for active, completed.desc for completed)
  #   q: keyword (customer name / project title)
  #   limit: integer (default 100)
  def index
    status = params[:status].presence || "active"
    limit  = (params[:limit] || 100).to_i.clamp(1, 1000)
    q      = params[:q].to_s.strip

    base = Project.includes(:customer, :deliveries, { tasks: [{ task_materials: :material }] })

    rel =
      case status
      when "completed" then base.where(status: "completed")
      when "all"       then base
      else                   base.where.not(status: "completed")
      end

    if q.present?
      rel = rel.joins(:customer).where(
        "projects.title ILIKE :q OR customers.name ILIKE :q",
        q: "%#{q}%"
      )
    end

    order = params[:order].to_s
    rel =
      case order
      when "due.desc"        then rel.order(due_on: :desc, id: :desc)
      when "completed.asc"   then rel.order(completed_at: :asc, id: :asc)
      when "completed.desc"  then rel.order(completed_at: :desc, id: :desc)
      else                        rel.order(due_on: :asc, id: :asc) # default
      end

    items = rel.limit(limit).map { |p| serialize_project_for_list(p) }

    render json: { items: items }
  end

  # GET /api/projects/:id
  def show
    p = Project
          .includes(:customer, :deliveries, { tasks: [{ task_materials: :material }] })
          .find(params[:id])

    render json: serialize_project_for_show(p)
  end

  private

  def serialize_project_for_list(p)
    # 代表納品（運用は1件pending前提。なければ最新を採用）
    delivery = p.deliveries.sort_by { |d| [d.status == "pending" ? 0 : 1, d.date || Date.new(2100,1,1)] }.first

    # Projectのタスクから集計を取得
    tasks_count = p.tasks.size
    prepared_count = p.tasks.count { |t| t.status == "done" }

    # 在庫不足チェック（タスクが存在する場合のみ）
    has_insufficient_stock = false
    if p.tasks.any?
      stock_check = Inventory::CheckTaskMaterials.call(task_ids: p.tasks.pluck(:id))
      has_insufficient_stock = stock_check.any? { |sc| !sc[:stock_sufficient] }
    end

    {
      id: p.id,
      title: p.title,
      status: p.status,
      dueOn: p.due_on,
      completedAt: p.completed_at,
      customerId: p.customer_id,
      customerName: p.customer&.name,
      customerPhone: p.customer&.phone,
      hasInsufficientStock: has_insufficient_stock,
      delivery: delivery && {
        id: delivery.id,
        date: delivery.date,
        status: delivery.status,
        tasksCount: tasks_count,
        preparedCount: prepared_count,
        allPrepared: tasks_count > 0 && prepared_count == tasks_count
      }
    }
  end

  def serialize_project_for_show(p)
    delivery = p.deliveries.order(Arel.sql("CASE WHEN status='pending' THEN 0 ELSE 1 END"), :date).first
    {
      project: {
        id: p.id,
        title: p.title,
        status: p.status,
        dueOn: p.due_on,
        completedAt: p.completed_at
      },
      customer: {
        id: p.customer_id,
        name: p.customer&.name,
        phone: p.customer&.phone,
        address: p.customer&.address
      },
      delivery: delivery && {
        id: delivery.id,
        date: delivery.date,
        status: delivery.status,
        tasksCount: p.tasks.size,
        preparedCount: p.tasks.count { |t| t.status == "done" },
        allPrepared: p.tasks.any? && p.tasks.all? { |t| t.status == "done" }
      },
      tasks: p.tasks.order(:due_on, :id).map { |t|
        # 在庫チェックサービスを使用
        stock_check = Inventory::CheckTaskMaterials.call(task_ids: [t.id]).first
        
        {
          id: t.id,
          title: t.title,
          status: t.status,
          dueOn: t.due_on,
          stockSufficient: stock_check ? stock_check[:stock_sufficient] : true,
          insufficientMaterials: (stock_check ? stock_check[:insufficient_materials] : []).map { |im|
            {
              name: im[:name],
              required: im[:required].to_f,
              available: im[:available].to_f,
              shortage: im[:shortage].to_f
            }
          },
          materials: t.task_materials.map { |m|
            { materialName: (m.material_name.presence || m.material&.name), qtyPlanned: m.qty_planned&.to_f }
          }
        }
      }
      # 写真は既存 /api/projects/:id/photos を別エンドポイントで利用（フロントで既存フック流用）
    }
  end
end
