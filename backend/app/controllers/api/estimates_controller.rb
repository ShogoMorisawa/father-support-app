module Api
    class EstimatesController < Api::BaseController
      include RequireIdempotency

      # GET /api/estimates?from=YYYY-MM-DD&limit=3
      def index
        from  = params[:from].present? ? Date.parse(params[:from]) : Date.today
        limit = [ (params[:limit] || 3).to_i, 100 ].min

        # ダッシュボードと同じ条件で見積もりを取得
        start_jst = Time.find_zone("Asia/Tokyo").local(from.year, from.month, from.day)
        # 予約中と完了済みの見積もりを取得
        rel = Estimate.where(status: %w[scheduled completed]).order(scheduled_at: :asc)
        rel = rel.where("scheduled_at >= ?", start_jst)
        items = rel.limit(limit).map do |e|
          {
            id: e.id,
            scheduledAt: e.scheduled_at.iso8601,
            status: e.status,
            accepted: e.accepted,
            customer: {
              id: e.customer_id,
              name: e.customer_snapshot["name"],
              phone: e.customer_snapshot["phone"],
              address: e.customer_snapshot["address"]
            }.compact
          }
        end
        render_ok(data: { items: items })
      rescue ArgumentError
        render_error(code: "invalid", message: "from の形式が不正です。", status: 422)
      end

      # POST /api/estimates
      def create
        payload = params.permit!.to_h
        result  = ::Estimates::CreateService.call(payload)
        if result.ok
          render_ok(data: { id: result.estimate.id }, status: 201)
        else
          render_error(code: "invalid", message: result.error_message, status: 422)
        end
      end
    end
end
