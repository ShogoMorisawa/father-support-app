FactoryBot.define do
    factory :material do
      name { "障子紙（標準）" }
      unit { "枚" }
      current_qty { 50 }
      threshold_qty { 10 }
    end
  end
  