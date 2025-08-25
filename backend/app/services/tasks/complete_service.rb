module Tasks
    class CompleteService
      Result = Struct.new(:ok, :task, :error_code, :error_message, keyword_init: true)
  
      def self.call(task_id:)
        new(task_id:).call
      end
  
      def initialize(task_id:)
        @task_id = task_id.to_i
      end
  
      def call
        ActiveRecord::Base.transaction do
          t = ::Task.lock.find(@task_id)
          
          # 冪等性チェック：既に完了済みの場合は成功として返す
          if t.status == "done"
            return Result.new(ok: true, task: t)
          end
          
          # 在庫不足チェック（事前検証）
          insufficient_materials = []
          t.task_materials.each do |tm|
            qty = tm.effective_qty_for_inventory
            next unless qty > 0
            m = tm.material_id ? ::Material.lock.find(tm.material_id) : ::Material.find_by(name: tm.material_name)
            next unless m
            if m.current_qty.to_d < qty.to_d
              insufficient_materials << "#{m.name}（必要:#{qty}、在庫:#{m.current_qty}）"
            end
          end
          
          if insufficient_materials.any?
            return Result.new(
              ok: false, 
              error_code: "insufficient_stock", 
              error_message: "在庫が不足しています: #{insufficient_materials.join(', ')}"
            )
          end
          
          # 在庫減算：qty_used が入っていればそれ、無ければ qty_planned を使用
          t.task_materials.each do |tm|
            qty = tm.effective_qty_for_inventory
            next unless qty > 0
            m = tm.material_id ? ::Material.lock.find(tm.material_id) : ::Material.find_by(name: tm.material_name)
            next unless m
            m.update!(current_qty: (m.current_qty.to_d - qty.to_d))
          end
          
          # ステータスとprepared_atを同時更新
          t.update!(status: "done", prepared_at: Time.current)
          
          changes = t.task_materials.filter_map do |tm|
            q = tm.effective_qty_for_inventory
            next if q <= 0
            name = tm.material&.name || tm.material_name
            "#{name} -#{q.to_s('F')}"
          end
          summary = changes.present? ? "タスク完了（在庫: #{changes.join(' / ')}）" : "タスク完了"
          
          ::AuditLog.create!(
            action: "task.complete", target_type: "task", target_id: t.id, summary: summary,
            inverse: { method: "POST", path: "/api/tasks/#{t.id}/revert-complete", payload: {} }
          )
          Result.new(ok: true, task: t)
        end
      rescue ActiveRecord::RecordNotFound
        Result.new(ok: false, error_code: "not_found", error_message: "タスクが見つかりません。")
      rescue ActiveRecord::StaleObjectError
        Result.new(ok: false, error_code: "conflict", error_message: "タスクが他の操作で更新されています。ページを再読み込みしてください。")
      end
  
      private
  
      def conflict!(code)
        Result.new(ok: false, error_code: "conflict", error_message: code)
      end
    end
  end
  