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
            # itemsが0件の場合は在庫バナーを出さない
            if e.estimate_items.any?
              stock_preview = ::Estimates::StockPreviewService.call(estimate: e)
              item_data[:stockPreview] = {
                overallStatus: stock_preview.overall_status,
                summary: stock_preview.summary,
                perLine: stock_preview.per_line,
                shortages: stock_preview.shortages,
                unregistered: stock_preview.unregistered
              }
            else
              item_data[:stockPreview] = { mode: 'not_applicable' }
            end
            
            # 見積項目の詳細も含める
            item_data[:estimateItems] = e.estimate_items.map do |item|
              {
                id: item.id,
                materialName: item.material_name,
                qty: item.qty,
                material: item.material ? {
                  id: item.material.id,
                  name: item.material.name,
                  unit: item.material.unit
                } : nil
              }
            end
            
            # hasItemsフラグを追加
            item_data[:hasItems] = e.estimate_items.any?
          end
          
          item_data
        end
        
        render_ok(data: { items: items })
      rescue ArgumentError
        render_error(code: "invalid", message: "from の形式が不正です。", status: 422)
      end

      # GET /api/estimates/:id
      def show
        estimate = Estimate.includes(estimate_items: :material).find(params[:id])
        
        render_ok(data: {
          estimate: {
            id: estimate.id,
            scheduledAt: estimate.scheduled_at.iso8601,
            status: estimate.status,
            accepted: estimate.accepted,
            customer: estimate.customer ? {
              id: estimate.customer.id,
              name: estimate.customer.name,
              phone: estimate.customer.phone,
              address: estimate.customer.address
            } : nil,
            customerSnapshot: estimate.customer_snapshot
          },
          items: estimate.estimate_items.order(:position).map do |item|
            {
              id: item.id,
              materialId: item.material_id,
              materialName: item.material_name,
              category: item.category,
              qty: item.qty,
              unit: item.unit,
              position: item.position
            }
          end
        })
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

      # PATCH /api/estimates/:id/items
      def items
        Rails.logger.info "Items action called with params: #{params.inspect}"
        
        estimate = Estimate.find(params[:id])
        
        # 明細の置換更新
        items_params = params.require(:items).map do |item|
          Rails.logger.info "Processing item: #{item.inspect}"
          item.permit(:id, :materialId, :materialName, :category, :qty, :unit, :position)
        end
        
        Rails.logger.info "Processed items_params: #{items_params.inspect}"
        
        # 既存の明細を削除
        estimate.estimate_items.destroy_all
        
        # 新しい明細を作成
        items_params.each_with_index do |item_params, index|
          estimate.estimate_items.create!(
            material_id: item_params[:materialId],
            material_name: item_params[:materialName],
            category: item_params[:category],
            qty: item_params[:qty],
            unit: item_params[:unit],
            position: item_params[:position] || index
          )
        end
        
        # 監査ログに記録
        ::AuditLog.create!(
          action: "estimate.items.updated",
          target_type: "estimate",
          target_id: estimate.id,
          summary: "見積明細更新（#{estimate.estimate_items.count}件）"
        )
        
        render_ok(data: { 
          message: "明細を更新しました",
          itemsCount: estimate.estimate_items.count
        })
      rescue ActiveRecord::RecordNotFound
        render_error(code: "not_found", message: "見積が見つかりません", status: :not_found)
      rescue ActiveRecord::RecordInvalid => e
        render_error(code: "validation_error", message: e.record.errors.full_messages.join(", "), status: :unprocessable_entity)
      rescue ActionController::ParameterMissing => e
        Rails.logger.error "Parameter missing error: #{e.message}"
        render_error(code: "parameter_missing", message: "パラメータが不足しています: #{e.message}", status: :bad_request)
      rescue => e
        Rails.logger.error "Unexpected error: #{e.message}"
        Rails.logger.error e.backtrace.first(5)
        render_error(code: "internal_error", message: "予期しないエラーが発生しました: #{e.message}", status: :internal_server_error)
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
