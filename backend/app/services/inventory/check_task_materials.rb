module Inventory
  class CheckTaskMaterials
    Result = Struct.new(:stock_sufficient, :insufficient_materials, :unregistered_materials, keyword_init: true)

    def self.call(task:)
      new(task).call
    end

    def initialize(task)
      @task = task
    end

    def call
      insufficient = []
      unregistered = []

      @task.task_materials.includes(:material).each do |tm|
        qty = tm.effective_qty_for_inventory
        next unless qty && qty > 0

        material = tm.material
        if material.nil?
          # 未登録（在庫不明）
          unregistered << {
            name: tm.material_name,
            required: qty.to_f,
            status: 'unregistered'
          }
          next
        end

        # 実在庫チェック
        if material.current_qty < qty
          insufficient << {
            name: material.name,
            required: qty.to_f,
            available: material.current_qty.to_f,
            shortage: (qty - material.current_qty).to_f
          }
        end
      end

      Result.new(
        stock_sufficient: insufficient.empty?,
        insufficient_materials: insufficient,
        unregistered_materials: unregistered
      )
    end
  end
end
