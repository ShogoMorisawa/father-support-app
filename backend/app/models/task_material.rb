class TaskMaterial < ApplicationRecord
    belongs_to :task
    belongs_to :material, optional: true

    validates :material_name, presence: true, unless: -> { material_id.present? }
    validates :qty_used, numericality: { greater_than_or_equal_to: 0 }
    validates :qty_planned, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
end
