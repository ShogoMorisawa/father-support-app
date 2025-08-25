module Tasks
    class RevertCompleteService
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
          
          # 冪等性チェック：既に未完了の場合は成功として返す
          if t.status != "done"
            return Result.new(ok: true, task: t)
          end
          
          # 在庫戻し
          t.task_materials.each do |tm|
            qty = tm.effective_qty_for_inventory
            next unless qty > 0
            m = tm.material_id ? ::Material.lock.find(tm.material_id) : ::Material.find_by(name: tm.material_name)
            next unless m
            m.update!(current_qty: (m.current_qty.to_d + qty.to_d))
          end
          
          # ステータスとprepared_atを同時更新
          t.update!(status: "todo", prepared_at: nil)
          
          changes = t.task_materials.filter_map do |tm|
            q = tm.effective_qty_for_inventory
            next if q <= 0
            name = tm.material&.name || tm.material_name
            "#{name} +#{q.to_s('F')}"
          end
          summary = changes.present? ? "タスク完了を取り消し（在庫: #{changes.join(' / ')}）" : "タスク完了を取り消し"
          
          ::AuditLog.create!(
            action: "task.revert_complete", target_type: "task", target_id: t.id, summary: summary,
            inverse: { method: "POST", path: "/api/tasks/#{t.id}/complete", payload: {} }
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
  