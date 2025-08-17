FactoryBot.define do
    factory :task do
      association :project
      title { "作業" }
      kind { "work" }
      status { "todo" }
      due_on { Date.today }
    end
  end
