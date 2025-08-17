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
          return conflict!("already_done") if t.status == "done"
          # 在庫減算：qty_used が入っていればそれ、無ければ qty_planned を使用
          t.task_materials.each do |tm|
            qty = tm.effective_qty_for_inventory
            next unless qty > 0
            m = tm.material_id ? ::Material.lock.find(tm.material_id) : ::Material.find_by(name: tm.material_name)
            next unless m
            m.update!(current_qty: (m.current_qty.to_d - qty.to_d))
          end
          t.update!(status: "done")
          ::AuditLog.create!(
            action: "task.complete", target_type: "task", target_id: t.id, summary: "タスク完了",
            inverse: { method: "POST", path: "/api/tasks/#{t.id}/revert-complete", payload: {} }
          )
          Result.new(ok: true, task: t)
        end
      rescue ActiveRecord::RecordNotFound
        Result.new(ok: false, error_code: "not_found", error_message: "タスクが見つかりません。")
      end
  
      private
  
      def conflict!(code)
        Result.new(ok: false, error_code: "conflict", error_message: code)
      end
    end
  end
  