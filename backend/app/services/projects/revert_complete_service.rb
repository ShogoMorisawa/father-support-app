module Projects
  class RevertCompleteService
    Result = Struct.new(:ok, :project, :error_code, :error_message, keyword_init: true)

    def self.call(project_id:)
      new(project_id:).call
    end

    def initialize(project_id:)
      @project_id = project_id.to_i
    end

    def call
      ActiveRecord::Base.transaction do
        project = ::Project.lock.find(@project_id)
        return conflict!("not_completed") unless project.status == "completed"

        # 在庫復元
        project.tasks.includes(:task_materials).each do |task|
          task.task_materials.each do |tm|
            if tm.material_id.present? && tm.qty_used > 0
              material = ::Material.lock.find(tm.material_id)
              material.current_qty += tm.qty_used
              material.save!
            end
          end
        end

        project.update!(status: "delivery_scheduled")
        ::Delivery.lock.where(project_id: project.id, status: "delivered").update_all(status: "pending")

        ::AuditLog.create!(
          action: "project.revert_complete",
          target_type: "project",
          target_id: project.id,
          summary: "納品完了を取り消し（案件を再オープン）",
          inverse: { method: "POST", path: "/api/projects/#{project.id}/complete", payload: {} }
        )

        Result.new(ok: true, project: project)
      end
    rescue ActiveRecord::RecordNotFound
      Result.new(ok: false, error_code: "not_found", error_message: "案件が見つかりません。")
    end

    private

    def conflict!(code)
      Result.new(ok: false, error_code: "conflict", error_message: code)
    end
  end
end
