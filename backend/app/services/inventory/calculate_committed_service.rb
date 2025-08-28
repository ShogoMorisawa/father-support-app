module Inventory
  class CalculateCommittedService
    # 戻り値: { material_id(Integer) => BigDecimal } の Hash
    def self.call
      # status は done を除外。プロジェクト実装に合わせて where 条件を調整
      # SUM(COALESCE(NULLIF(qty_used, 0), NULLIF(qty_planned, 0))) を effectiveQty とする
      rows = TaskMaterial.joins(:task)
        .where.not(material_id: nil)
        .where.not(tasks: { status: 'done' })
        .where('qty_used > 0 OR qty_planned > 0') # 有効な数量のみ
        .group(:material_id)
        .pluck(:material_id, Arel.sql("SUM(COALESCE(NULLIF(qty_used, 0), NULLIF(qty_planned, 0)))"))

      rows.to_h.transform_values { |v| (v || 0).to_d }
    end
  end
end
