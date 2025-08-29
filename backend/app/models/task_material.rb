class TaskMaterial < ApplicationRecord
    belongs_to :task
    belongs_to :material, optional: true

    # material_idを必須に変更（新規作成・更新の双方）
    validates :material_id, presence: { message: "材料を選択してください" }
    validates :qty_used, numericality: { greater_than: 0 }, allow_nil: true
    validates :qty_planned, numericality: { greater_than: 0 }, allow_nil: true

    # マスター選択時に材料情報を同期（クライアント入力は無視）
    before_validation :sync_material_info, if: :material_id_changed?
    before_validation :sync_material_info, if: -> { material_id.present? && material.present? }

    # 既存レコードでmaterial_idが無いものは更新不可
    validate :prevent_update_without_material_id, on: :update

    # 在庫計算に用いる数量（qty_used>0 を優先、なければ qty_planned>0 を採用）
    def effective_qty_for_inventory
      u = qty_used
      return u.to_d if u.present? && u.to_d > 0
      p = qty_planned
      return p.to_d if p.present? && p.to_d > 0
      0.to_d
    end

    private

    def sync_material_info
      return unless material

      self.material_name = material.name
      self.unit = material.unit
      # categoryフィールドはtask_materialsテーブルに存在しないため削除
    end

    def prevent_update_without_material_id
      if material_id.blank?
        errors.add(:base, "材料が選択されていない行は編集できません。材料マスターから選択してください。")
      end
    end
end
