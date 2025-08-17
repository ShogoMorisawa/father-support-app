FactoryBot.define do
    factory :project do
      association :customer
      title { "A様 障子4枚" }
      status { "in_progress" }
      due_on { Date.today }
    end
  end
