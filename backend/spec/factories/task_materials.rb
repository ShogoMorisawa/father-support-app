FactoryBot.define do
    factory :task_material do
      association :task
      association :material
      material_name { material&.name || "材料" }
      qty_planned { 4 }
      qty_used { 4 }
    end
  end
