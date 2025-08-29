class Projects::Tasks::BulkCreateService
  def self.call(project_id:, items:, delivery_on:, delivery_time: nil)
    new(project_id:, items: items || [], delivery_on: delivery_on, delivery_time: delivery_time).call
  end

  def initialize(project_id:, items:, delivery_on:, delivery_time: nil)
    @project_id = project_id.to_i
    @items = items
    @delivery_on = Date.parse(delivery_on.to_s)
    @delivery_time = delivery_time
  end

  def call
    ActiveRecord::Base.transaction do
      project = Project.lock.find(@project_id)
      raise StandardError, "project must be active" if project.status == "completed"

      # 納品予定日はプロジェクト単位
      project.update!(due_on: @delivery_on)

      # プロジェクトの Delivery（pending）を1件だけ維持
      delivery = Delivery.lock.where(project_id: project.id, status: "pending").first_or_initialize
      delivery.date  = @delivery_on
      delivery.title = delivery.title.presence || "納品"
      delivery.delivery_time = @delivery_time if @delivery_time.present?
      delivery.save!

      tasks = []

      @items.each do |it|
        title = it["title"].to_s.strip
        kind  = it["kind"].presence

        t = ::Task.create!(
          project_id: project.id,
          title: title,
          kind: kind,
          status: "todo",
          due_on: @delivery_on
        )
        tasks << t

        # 材料情報を処理してTaskMaterialを作成
        Array(it["materials"]).each do |m|
          name = (m["materialName"] || m["name"]).to_s.strip
          qty_planned = m["qtyPlanned"]
          material_id = m["materialId"]
          
          Rails.logger.debug "Processing material: #{m.inspect}"
          
          # 完全空行は捨てる
          next if name.blank? && (qty_planned.blank? || qty_planned == 0)
          
          # material_idが必須なので、nilの場合は作成しない
          next if material_id.blank?
          
          # 材料を検索
          material = ::Material.find_by(id: material_id)
          
          # 材料が見つからない場合はエラー
          raise StandardError, "材料ID #{material_id} が見つかりません" unless material
          
          Rails.logger.debug "Creating TaskMaterial with: task_id=#{t.id}, material_id=#{material_id}, qty_planned=#{qty_planned}, unit=#{material.unit}"
          
          task_material = ::TaskMaterial.new(
            task: t,
            material_id: material_id,  # material_idを直接設定
            material_name: material.name,
            qty_planned: qty_planned.present? ? BigDecimal(qty_planned.to_s) : nil,
            qty_used: nil,  # 明示的にnilを設定
            unit: material.unit
          )
          
          Rails.logger.debug "TaskMaterial valid? #{task_material.valid?}"
          Rails.logger.debug "TaskMaterial errors: #{task_material.errors.full_messages}" unless task_material.valid?
          
          # バリデーションエラーがある場合は詳細をログに出力
          unless task_material.valid?
            Rails.logger.error "TaskMaterial validation failed:"
            Rails.logger.error "  material_id: #{task_material.material_id}"
            Rails.logger.error "  material_name: #{task_material.material_name}"
            Rails.logger.error "  qty_planned: #{task_material.qty_planned}"
            Rails.logger.error "  unit: #{task_material.unit}"
            Rails.logger.error "  Errors: #{task_material.errors.full_messages}"
            raise StandardError, "TaskMaterial validation failed: #{task_material.errors.full_messages.join(', ')}"
          end
          
          task_material.save!
        end
      end

      # 監査ログを作成（将来のUndo機能用）
      ::AuditLog.create!(
        action: "tasks.bulk_create",
        target_type: "project",
        target_id: project.id,
        summary: "作業一括作成（#{tasks.length}件）",
        inverse: {} # TODO: 将来実装 - 一括削除のUndo用
      )

      Result.new(ok: true, project: project, tasks: tasks, deliveries: [delivery])
    end
  rescue StandardError => e
    Result.new(ok: false, error: e.message)
  end

  private

  class Result
    attr_reader :ok, :project, :tasks, :deliveries, :error

    def initialize(ok:, project: nil, tasks: nil, deliveries: nil, error: nil)
      @ok = ok
      @project = project
      @tasks = tasks
      @deliveries = deliveries
      @error = error
    end

    def error_code
      return nil if @error.nil?
      
      case @error
      when /project must be active/
        "project_inactive"
      when /not found/i
        "not_found"
      else
        "invalid"
      end
    end

    def error_message
      @error
    end
  end
end
