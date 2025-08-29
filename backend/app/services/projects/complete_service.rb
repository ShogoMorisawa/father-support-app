module Projects
  class CompleteService
    Result = Struct.new(:ok, :project, :error_code, :error_message, :low_stock, keyword_init: true)

    def self.call(project_id:, completed_at: nil)
      new(project_id:, completed_at: completed_at || Time.current).call
    end

    def initialize(project_id:, completed_at:)
      @project_id = project_id.to_i
      @completed_at = completed_at.is_a?(String) ? Time.iso8601(completed_at) : completed_at
    end

    def call
      ActiveRecord::Base.transaction do
        project = ::Project.lock.find(@project_id)
        return conflict!("already_completed") if project.status == "completed"
        
        # delivery_scheduled状態のプロジェクトは完了可能
        unless ["in_progress", "delivery_scheduled"].include?(project.status)
          return conflict!("invalid_status")
        end

        tasks = project.tasks.to_a
        not_done      = tasks.select { |t| t.status != "done" }
        # 完了済みタスクまたは準備完了済みタスクは完了可能
        not_prepared  = tasks.select { |t| t.status != "done" && t.prepared_at.nil? && t.task_materials.any? { |tm| tm.qty_used.present? && tm.qty_used > 0 } }

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
            if tm.material_id.present? && tm.qty_used.present? && tm.qty_used > 0
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

        # プロジェクトを完了状態に更新（完了日時も保存）
        project.update!(status: "completed", completed_at: @completed_at)

        # Delivery を delivered に（プロジェクト単位の運用、完了日時も保存）
        ::Delivery.lock.where(project_id: project.id, status: "pending").update_all(
          status: "delivered", 
          completed_at: @completed_at
        )

        deltas = []
        project.tasks.includes(:task_materials).each do |task|
          task.task_materials.each do |tm|
            if tm.material_id.present? && tm.qty_used.present? && tm.qty_used > 0
              name = ::Material.find(tm.material_id).name rescue (tm.material&.name || tm.material_name)
              deltas << "#{name} -#{tm.qty_used.to_s('F')}"
            end
          end
        end

        # 監査ログに完了日時も含める
        ::AuditLog.create!(
          action: "project.complete",
          target_type: "project",
          target_id: project.id,
          summary: deltas.present? ? "納品完了（在庫: #{deltas.join(' / ')}）完了日時: #{@completed_at.strftime('%Y/%m/%d %H:%M')}" : "納品完了（案件完了）完了日時: #{@completed_at.strftime('%Y/%m/%d %H:%M')}",
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
