module Inventory
  class CheckTaskMaterials
    def self.call(task_ids:)
      new(task_ids).call
    end

    def initialize(task_ids)
      @task_ids = Array(task_ids)
    end

    def call
      return [] if @task_ids.empty?

      tasks = Task.includes(task_materials: :material).where(id: @task_ids)
      
      tasks.map do |task|
        insufficient_materials = []
        stock_sufficient = true
        
        task.task_materials.each do |tm|
          qty_planned = tm.qty_planned
          next unless qty_planned && qty_planned > 0
          
          material = tm.material_id ? tm.material : (tm.material_name.present? ? Material.find_by(name: tm.material_name) : nil)
          if material
            available_qty = material.current_qty || 0
            if available_qty < qty_planned
              insufficient_materials << {
                name: material.name,
                required: qty_planned,
                available: available_qty,
                shortage: qty_planned - available_qty
              }
              stock_sufficient = false
            end
          else
            # 材料が見つからない場合は不足扱い
            insufficient_materials << {
              name: tm.material_name,
              required: qty_planned,
              available: 0,
              shortage: qty_planned
            }
            stock_sufficient = false
          end
        end

        {
          task_id: task.id,
          stock_sufficient: stock_sufficient,
          insufficient_materials: insufficient_materials
        }
      end
    end
  end
end
