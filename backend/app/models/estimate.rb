class Estimate < ApplicationRecord
    belongs_to :customer, optional: true
    belongs_to :project,  optional: true
    has_many :estimate_items, dependent: :delete_all

    enum :status, { scheduled: "scheduled", completed: "completed", cancelled: "cancelled" }, validate: true

    validates :scheduled_at, presence: true
    validates :price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true
    validates :project_id, uniqueness: true, allow_nil: true

    validate :consistency_on_completion

    private

    def consistency_on_completion
      return unless status == "completed"

      if accepted.nil?
        errors.add(:accepted, "は確定時に必須です")
      end

      if accepted == true
        errors.add(:project, "成立時は案件が必須です") if project_id.nil?
        if price_cents.nil? || price_cents.negative?
          errors.add(:price_cents, "成立時は0以上の金額が必要です")
        end
      end

      if accepted == false
        errors.add(:project, "不成立時は案件を紐づけできません") if project_id.present?
      end
    end
end
