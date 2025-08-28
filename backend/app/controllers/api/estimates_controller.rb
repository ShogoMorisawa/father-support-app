module Api
    class EstimatesController < Api::BaseController
      include RequireIdempotency

      # GET /api/estimates?from=YYYY-MM-DD&limit=3&withStock=1
      def index
        from  = params[:from].present? ? Date.parse(params[:from]) : Date.today
        limit = [ (params[:limit] || 3).to_i, 100 ].min
        with_stock = params[:withStock] == '1' || params[:withStock] == 1

        # ダッシュボードと同じ条件で見積もりを取得
        start_jst = Time.find_zone("Asia/Tokyo").local(from.year, from.month, from.day)
        # 予約中と完了済みの見積もりを取得
        rel = Estimate.where(status: %w[scheduled completed]).order(scheduled_at: :asc)
        rel = rel.where("scheduled_at >= ?", start_jst)
        
        # 在庫情報が必要な場合は estimate_items も含めて取得
        if with_stock
          rel = rel.includes(estimate_items: :material)
        end
        
        estimates = rel.limit(limit)
        
        # 在庫情報を一括計算（N+1回避）
        # availability_map は StockPreviewService 内で構築する
        
        items = estimates.map do |e|
          item_data = {
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
          
          # 在庫情報を追加
          if with_stock
            stock_preview = ::Estimates::StockPreviewService.call(estimate: e)
            item_data[:stockPreview] = {
              overallStatus: stock_preview.overall_status,
              summary: stock_preview.summary,
              perLine: stock_preview.per_line,
              shortages: stock_preview.shortages,
              unregistered: stock_preview.unregistered
            }
            
            # 見積項目の詳細も含める
            item_data[:estimateItems] = e.estimate_items.map do |item|
              {
                id: item.id,
                materialName: item.material_name,
                quantity: item.quantity,
                material: item.material ? {
                  id: item.material.id,
                  name: item.material.name,
                  unit: item.material.unit
                } : nil
              }
            end
          end
          
          item_data
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

      def update
        estimate = Estimate.find(params[:id])
        
        # scheduledAtパラメータを直接取得
        scheduled_at = params[:scheduledAt] || params[:scheduled_at]
        
        # 更新データを構築
        update_data = { scheduled_at: scheduled_at }
        
        if estimate.update(update_data)
          # 監査ログに日時変更を記録
          if estimate.scheduled_at_previously_changed?
            old_time = estimate.scheduled_at_previous_change[0]
            new_time = estimate.scheduled_at
            summary = "見積日時変更（#{old_time&.strftime('%Y/%m/%d %H:%M')} → #{new_time&.strftime('%Y/%m/%d %H:%M')}）"
            
            ::AuditLog.create!(
              action: "estimate.update_schedule",
              target_type: "estimate",
              target_id: estimate.id,
              summary: summary
            )
          end
          
          render_ok(data: { estimate: estimate })
        else
          render_error(message: estimate.errors.full_messages.join(", "), status: :unprocessable_entity)
        end
      end

      private



      def estimate_params
        params.require(:estimate).permit(:scheduled_at, :customer_id)
      end

      def update_params
        # トップレベルのパラメータも受け取れるように修正
        if params[:estimate].present?
          params.require(:estimate).permit(:scheduled_at)
        else
          # トップレベルのパラメータ（scheduledAt）を処理
          scheduled_at = params[:scheduledAt] || params[:scheduled_at]
          Rails.logger.info "scheduledAt: #{params[:scheduledAt]}"
          Rails.logger.info "scheduled_at: #{params[:scheduled_at]}"
          Rails.logger.info "最終的なscheduled_at: #{scheduled_at}"
          { scheduled_at: scheduled_at }
        end
      end
    end
end
