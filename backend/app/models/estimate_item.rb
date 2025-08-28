class EstimateItem < ApplicationRecord
  belongs_to :estimate
  belongs_to :material, optional: true

  validates :material_name, presence: true
  validates :qty, numericality: { greater_than_or_equal_to: 0 }, presence: true

  # マスター選択時に材料情報を同期
  before_save :sync_material_info, if: :material_id_changed?

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
end
