FactoryBot.define do
  factory :estimate_item do
    association :estimate
    association :material, optional: true
    material_name { material&.name || "材料" }
    qty { 1.0 }
    category { material ? nil : "障子" }
    unit { material&.unit || "個" }
    position { 0 }
  end
end
