class TaskMaterial < ApplicationRecord
    belongs_to :task
    belongs_to :material, optional: true

    validates :material_name, presence: true, unless: -> { material_id.present? }
    validates :qty_used, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true
    validates :qty_planned, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

    # 在庫計算に用いる数量（qty_used>0 を優先、なければ qty_planned>0 を採用）
    def effective_qty_for_inventory
      u = qty_used
      return u.to_d if u.present? && u.to_d > 0
      p = qty_planned
      return p.to_d if p.present? && p.to_d > 0
      0.to_d
    end
end
