class Project < ApplicationRecord
    belongs_to :customer
    has_many :tasks, dependent: :delete_all
    has_many :deliveries, dependent: :delete_all
    has_one :estimate, dependent: :nullify
  
    enum :status, {
      in_progress: "in_progress",
      delivery_scheduled: "delivery_scheduled",
      completed: "completed"
    }, validate: true
  
    validates :title, presence: true, length: { maximum: 200 }
    validate :due_on_required_if_in_progress
  
    private
  
    def due_on_required_if_in_progress
      if in_progress? && due_on.blank?
        errors.add(:due_on, "は作業中の案件では必須です")
      end
    end
  end
  