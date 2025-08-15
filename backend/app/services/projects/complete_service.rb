module Projects
    class CompleteService
      Result = Struct.new(:ok, :project, :low_stock, :error_code, :error_message, keyword_init: true)

      def self.call(project_id:, completed_at: Time.current)
        new(project_id: project_id, completed_at: completed_at).call
      end

      def initialize(project_id:, completed_at:)
        @project_id = project_id.to_i
        @completed_at = completed_at
      end

      def call
        ActiveRecord::Base.transaction do
          project = Project.lock.find(@project_id)
          return Result.new(ok: false, error_code: "conflict", error_message: "すでに完了しています。") if project.completed?

          # ステータス遷移
          project.status = "completed"
          project.save!

          # 在庫を減算（task_materials.qty_used の合計）
          low = adjust_materials!(project.id, sign: -1)

          # 納品予定（pending）は削除
          Delivery.where(project_id: project.id, status: "pending").delete_all

          # 監査ログ（逆操作：revert-complete）
          AuditLog.create!(
            action:       "project.complete",
            target_type:  "project",
            target_id:    project.id,
            summary:      "作業完了",
            inverse:      { method: "POST", path: "/api/projects/#{project.id}/revert-complete", payload: {} },
            correlation_id: nil,
            actor:        nil
          )

          Result.new(ok: true, project: project, low_stock: low)
        end
      rescue ActiveRecord::RecordNotFound
        Result.new(ok: false, error_code: "not_found", error_message: "案件が見つかりません。")
      rescue ActiveRecord::StaleObjectError
        Result.new(ok: false, error_code: "conflict", error_message: "操作が競合しました。もう一度お試しください。")
      rescue ActiveRecord::RecordInvalid => e
        Result.new(ok: false, error_code: "invalid", error_message: e.record.errors.full_messages.join(", "))
      end

      private

      # sign=-1 減算 / +1 復元。負数を許さないため 0 でクランプ。
      def adjust_materials!(project_id, sign:)
        low = []
        TaskMaterial.joins(:task).where(tasks: { project_id: project_id }).find_each do |tm|
          qty = (tm.qty_used || 0).to_d
          next if qty.zero?

          mat =
            if tm.material_id.present?
              Material.lock.find_by(id: tm.material_id)
            else
              Material.lock.find_by(name: tm.material_name)
            end
          next unless mat

          next_qty = mat.current_qty.to_d + sign * qty
          mat.current_qty = [ next_qty, 0 ].max # 0未満にしない
          mat.save!

          if mat.current_qty < mat.threshold_qty
            low << {
              material_id:  mat.id,
              name:         mat.name,
              current_qty:  mat.current_qty.to_d,
              threshold_qty: mat.threshold_qty.to_d
            }
          end
        end
        low
      end
    end
end
