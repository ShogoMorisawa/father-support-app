class CustomerMemo < ApplicationRecord
  belongs_to :customer
  validates :body, presence: true, length: { maximum: 10_000 }
end
