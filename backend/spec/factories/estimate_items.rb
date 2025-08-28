FactoryBot.define do
  factory :estimate_item do
    association :estimate
    association :material, optional: true
    material_name { material&.name || "材料" }
    quantity { 1.0 }
  end
end
