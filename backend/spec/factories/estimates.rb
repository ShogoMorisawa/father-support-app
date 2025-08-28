FactoryBot.define do
  factory :estimate do
    association :customer
    scheduled_at { 1.day.from_now }
    status { 'scheduled' }
    customer_snapshot { { name: customer.name, phone: customer.phone, address: customer.address } }
  end
end
