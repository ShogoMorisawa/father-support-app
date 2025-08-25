module Api
  class CustomersController < Api::BaseController
    include RequireIdempotency

    def search
      q = params[:q].to_s.strip
      limit = [ (params[:limit] || 20).to_i, 100 ].min
      rel = q.present? ? Customer.search_like(q) : Customer.all
      items = rel.order(:name).limit(limit).map { |c| serialize(c) }
      render_ok(data: { items: items })
    end

    # GET /api/customers
    def index
      order = (params[:order] || "name.asc").to_s
      rel = Customer.all
      
      if order == "last_activity.desc"
        # 最近の活動順はRubyレベルでソート
        items = rel.includes(:projects, :estimates).map { |c| serialize(c) }
        items.sort_by! { |item| item[:lastActivityAt] || '1970-01-01' }.reverse!
        limit = [ (params[:limit] || 200).to_i, 500 ].min
        items = items.first(limit)
      else
        # その他の並び替えはDBレベルでソート
        rel = case order
        when "name.desc"   then rel.order(name: :desc)
        when "created.desc" then rel.order(created_at: :desc)
        else rel.order(name: :asc)
        end
        limit = [ (params[:limit] || 200).to_i, 500 ].min
        items = rel.limit(limit).map { |c| serialize(c) }
      end
      
      render_ok(data: { items: items })
    end

    # GET /api/customers/:id
    def show
      c = Customer.find(params[:id])
      render_ok(data: { customer: serialize(c), stats: stats_for(c) })
    rescue ActiveRecord::RecordNotFound
      render_error(code: "not_found", message: "顧客が見つかりません。", status: 404)
    end

    # POST /api/customers
    def create
      c = Customer.new(upsert_params)
      normalize_phone!(c)
      c.save!
      AuditLog.create!(action: "customer.create", target_type: "customer", target_id: c.id, summary: "顧客を登録", inverse: {})
      render_ok(data: { id: c.id }, status: 201)
    rescue ActiveRecord::RecordInvalid => e
      render_error(code: "invalid", message: e.record.errors.full_messages.join(", "), status: 422)
    end

    # PATCH /api/customers/:id
    def update
      c = Customer.find(params[:id])
      c.assign_attributes(upsert_params)
      normalize_phone!(c)
      c.save!
      AuditLog.create!(action: "customer.update", target_type: "customer", target_id: c.id, summary: "顧客を更新", inverse: {})
      render_ok(data: { customer: serialize(c), stats: stats_for(c) })
    rescue ActiveRecord::RecordNotFound
      render_error(code: "not_found", message: "顧客が見つかりません。", status: 404)
    rescue ActiveRecord::RecordInvalid => e
      render_error(code: "invalid", message: e.record.errors.full_messages.join(", "), status: 422)
    end

    private

    def serialize(c)
      {
        id: c.id,
        name: c.name,
        nameKana: c.name_kana,
        phone: c.phone,
        address: c.address,
        createdAt: c.created_at&.iso8601,
        lastActivityAt: c.last_activity_at&.iso8601
      }
    end

    def stats_for(c)
      {
        estimatesCount: Estimate.where(customer_id: c.id).count,
        projectsCount: Project.where(customer_id: c.id).count,
        activeProjectsCount: Project.where(customer_id: c.id, status: %w[in_progress delivery_scheduled]).count,
        completedProjectsCount: Project.where(customer_id: c.id, status: "completed").count,
        deliveriesPendingCount: Delivery.joins(:project).where(projects: { customer_id: c.id }, status: "pending").count
      }
    end

    def upsert_params
      params.permit(:name, :nameKana, :phone, :address, :name_kana)
            .to_h
            .transform_keys { |k| k.to_s.underscore }
    end

    def normalize_phone!(c)
      if c.phone.present? && c.respond_to?(:phone_normalized=)
        c.phone_normalized = c.phone.gsub(/\D/, "")
      end
    end
  end
end
