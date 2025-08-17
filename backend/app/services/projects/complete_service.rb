module Projects
  class CompleteService
    Result = Struct.new(:ok, :project, :error_code, :error_message, :low_stock, keyword_init: true)

    def self.call(project_id:)
      new(project_id:).call
    end

    def initialize(project_id:)
      @project_id = project_id.to_i
    end

    def call
      ActiveRecord::Base.transaction do
        project = ::Project.lock.find(@project_id)
        return conflict!("already_completed") if project.status == "completed"

        tasks = project.tasks.to_a
        not_done      = tasks.select { |t| t.status != "done" }
        not_prepared  = tasks.select { |t| t.prepared_at.nil? }

        if not_done.any? || not_prepared.any?
          msgs = []
          msgs << "未完了の作業があります（#{not_done.map(&:title).join(' / ')}）" if not_done.any?
          msgs << "準備未完了の作業があります（#{not_prepared.map(&:title).join(' / ')}）" if not_prepared.any?
          return Result.new(ok: false, error_code: "precondition_failed", error_message: msgs.join("・"))
        end

        # 在庫減算
        low_stock_materials = []
        project.tasks.includes(:task_materials).each do |task|
          task.task_materials.each do |tm|
            if tm.material_id.present? && tm.qty_used > 0
              material = ::Material.lock.find(tm.material_id)
              material.current_qty -= tm.qty_used
              material.save!
              
              # 閾値を下回った場合は low_stock に追加
              if material.current_qty < material.threshold_qty
                low_stock_materials << {
                  material_id: material.id,
                  name: material.name,
                  current_qty: material.current_qty,
                  threshold_qty: material.threshold_qty
                }
              end
            end
          end
        end

        # Delivery を delivered に（プロジェクト単位の運用）
        ::Delivery.lock.where(project_id: project.id, status: "pending").update_all(status: "delivered")

        project.update!(status: "completed")

        ::AuditLog.create!(
          action: "project.complete",
          target_type: "project",
          target_id: project.id,
          summary: "納品完了（案件完了）",
          inverse: { method: "POST", path: "/api/projects/#{project.id}/revert-complete", payload: {} }
        )

        Result.new(ok: true, project: project, low_stock: low_stock_materials)
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
