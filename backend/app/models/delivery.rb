class Delivery < ApplicationRecord
    belongs_to :project

    enum :status, { pending: "pending", delivered: "delivered", cancelled: "cancelled" }, validate: true

    validates :date, presence: true
    validates :title, length: { maximum: 255 }, allow_blank: true
    validates :project_id, uniqueness: { scope: [ :date, :title ],
                                         message: "同じ案件・日付・タイトルの納品が重複しています" }
end
