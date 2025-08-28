class EstimateItem < ApplicationRecord
  belongs_to :estimate
  belongs_to :material, optional: true

  # material_idを必須に変更（新規作成・更新の双方）
  validates :material_id, presence: { message: "材料を選択してください" }
  validates :qty, numericality: { greater_than: 0 }, presence: { message: "数量を入力してください" }

  # マスター選択時に材料情報を同期（クライアント入力は無視）
  before_validation :sync_material_info, if: :material_id_changed?
  before_validation :sync_material_info, if: -> { material_id.present? }

  # 既存レコードでmaterial_idが無いものは更新不可
  validate :prevent_update_without_material_id, on: :update

  private

  def sync_material_info
    return unless material

    self.material_name = material.name
    self.unit = material.unit
    # categoryフィールドが存在する場合のみ同期、存在しない場合はnilのまま
    if material.respond_to?(:category) && material.category.present?
      self.category = material.category
    end
  end

  def prevent_update_without_material_id
    if material_id.blank?
      errors.add(:base, "材料が選択されていない行は編集できません。材料マスターから選択してください。")
    end
  end
end
