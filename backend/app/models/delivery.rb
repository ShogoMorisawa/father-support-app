class Delivery < ApplicationRecord
    belongs_to :project

    enum :status, { pending: "pending", delivered: "delivered", cancelled: "cancelled" }, validate: true

    validates :date, presence: true
    validates :title, length: { maximum: 255 }, allow_blank: true
    validates :project_id, uniqueness: { scope: [ :date, :scheduled_at, :title ],
                                         message: "同じ案件・日付・時刻・タイトルの納品が重複しています" }
    
    # 時刻関連のスコープ
    scope :scheduled_at_time, ->(time) { where(scheduled_at: time) }
    scope :order_by_scheduled_at, -> { order(scheduled_at: :asc) }
    
    # 時刻が設定されている納品のみ
    scope :with_scheduled_time, -> { where.not(scheduled_at: nil) }
end
