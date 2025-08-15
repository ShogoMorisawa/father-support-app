module Projects
    class RevertCompleteService
      Result = Struct.new(:ok, :project, :error_code, :error_message, keyword_init: true)

      TZ = "Asia/Tokyo"

      def self.call(project_id:)
        new(project_id: project_id).call
      end

      def initialize(project_id:)
        @project_id = project_id.to_i
      end

      def call
        ActiveRecord::Base.transaction do
          project = Project.lock.find(@project_id)
          return Result.new(ok: false, error_code: "conflict", error_message: "未完了のため取り消せません。") unless project.completed?

          # ステータスを納品予定へ戻す
          project.status = "delivery_scheduled"
          project.save!

          # 在庫を復元
          adjust_materials!(project.id, sign: +1)

          # 納品予定が無ければ翌日（JST）で1件作成
          unless Delivery.exists?(project_id: project.id, status: "pending")
            date_jst = Time.current.in_time_zone(TZ).to_date + 1.day
            Delivery.create!(
              project_id: project.id,
              date:       date_jst,
              status:     "pending",
              title:      "納品"
            )
          end

          # 監査ログ（逆操作：complete）
          AuditLog.create!(
            action:       "project.revert_complete",
            target_type:  "project",
            target_id:    project.id,
            summary:      "作業完了を取り消し",
            inverse:      { method: "POST", path: "/api/projects/#{project.id}/complete", payload: {} },
            correlation_id: nil,
            actor:        nil
          )

          Result.new(ok: true, project: project)
        end
      rescue ActiveRecord::RecordNotFound
        Result.new(ok: false, error_code: "not_found", error_message: "案件が見つかりません。")
      rescue ActiveRecord::StaleObjectError
        Result.new(ok: false, error_code: "conflict", error_message: "操作が競合しました。もう一度お試しください。")
      rescue ActiveRecord::RecordInvalid => e
        Result.new(ok: false, error_code: "invalid", error_message: e.record.errors.full_messages.join(", "))
      end

      private

      def adjust_materials!(project_id, sign:)
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
          mat.current_qty = [ next_qty, 0 ].max
          mat.save!
        end
      end
    end
end
