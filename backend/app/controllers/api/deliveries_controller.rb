module Api
    class DeliveriesController < Api::BaseController
      def index
        status_in = params[:status].to_s
        # 有効なステータスのみを許可
        valid_statuses = %w[pending delivered cancelled all]
        status = valid_statuses.include?(status_in) ? status_in : "pending"
        order  = params[:order].to_s
        limit  = [[(params[:limit] || 200).to_i, 1].max, 500].min

        rel = Delivery.includes(project: :customer)
        # 特定のステータスのみをフィルタリング
        rel = rel.where(status: status) unless status == "all"
        rel = (order == "date.desc") ? rel.order(date: :desc) : rel.order(date: :asc)
        rel = rel.limit(limit)

        items = rel.map { |d|
          # タスク集計を取得
          tasks = d.project&.tasks || []
          tasks_count = tasks.count
          prepared_count = tasks.count { |t| t.prepared_at.present? }
          all_prepared = tasks_count > 0 && prepared_count == tasks_count

          {
            id: d.id,
            projectId: d.project_id,
            date: d.date&.to_s,
            status: d.status,
            title: d.title,
            customerName: d.project&.customer&.name,
            tasksCount: tasks_count,
            preparedCount: prepared_count,
            allPrepared: all_prepared
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
          completedAt: delivery.completed_at&.iso8601,
          tasks: delivery.project&.tasks&.map { |t|
            # 在庫プレビューを計算
            insufficient_materials = []
            stock_sufficient = true
            
            t.task_materials.each do |tm|
              qty_planned = tm.qty_planned
              next unless qty_planned && qty_planned > 0
              
              material = tm.material_id ? Material.find_by(id: tm.material_id) : Material.find_by(name: tm.material_name)
              if material
                available_qty = material.current_qty || 0
                if available_qty < qty_planned
                  insufficient_materials << {
                    materialName: material.name,
                    needed: qty_planned,
                    available: available_qty
                  }
                  stock_sufficient = false
                end
              else
                # 材料が見つからない場合は不足扱い
                insufficient_materials << {
                  materialName: tm.material_name,
                  needed: qty_planned,
                  available: 0
                }
                stock_sufficient = false
              end
            end

            {
              id: t.id,
              title: t.title,
              kind: t.kind,
              dueOn: t.due_on&.to_s,
              status: t.status,
              preparedAt: t.prepared_at&.to_s,
              stockSufficient: stock_sufficient,
              insufficientMaterials: insufficient_materials,
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

      def revert_complete
        result = ::Deliveries::RevertCompleteService.call(delivery_id: params[:id])
        
        if result.ok
          render_ok(data: { message: "納品完了を取り消しました" })
        else
          render_error(
            error_code: result.error_code,
            message: result.error_message,
            status: :unprocessable_entity
          )
        end
      end
    end
end
