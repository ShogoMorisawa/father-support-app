class Customer < ApplicationRecord
    has_many :projects, dependent: :restrict_with_exception
    has_many :estimates, dependent: :restrict_with_exception
    has_many :memos, dependent: :destroy

    validates :name, presence: true, length: { maximum: 100 }
    validates :name_kana, length: { maximum: 100 }, allow_blank: true
    validates :phone, length: { maximum: 20 }, allow_blank: true

    before_save :normalize_phone!

    scope :search_like, ->(q) {
      next all if q.blank?
      pattern = "%#{q}%"
      where("name ILIKE :q OR name_kana ILIKE :q OR phone ILIKE :q OR phone_normalized LIKE :qn",
            q: pattern, qn: q.gsub(/\D/, ""))
    }

    # 最近の活動日時を計算
    def last_activity_at
      [
        projects.maximum(:updated_at),
        estimates.maximum(:updated_at),
        projects.joins(:deliveries).maximum('deliveries.updated_at')
      ].compact.max
    end

    # 進行中のタスク数
    def active_tasks_count
      projects.joins(:tasks).where(tasks: { status: 'in_progress' }).count
    end

    # 未納品数
    def deliveries_pending_count
      projects.joins(:deliveries).where(deliveries: { status: 'pending' }).count
    end

    private

    def normalize_phone!
      self.phone_normalized = phone.to_s.gsub(/\D/, "") if will_save_change_to_phone?
    end
end
