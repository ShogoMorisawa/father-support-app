class Material < ApplicationRecord
    self.locking_column = :lock_version
  
    validates :name, presence: true, uniqueness: true
    validates :current_qty, :threshold_qty,
              numericality: { greater_than_or_equal_to: 0 }, presence: true
  
    scope :low_stock, -> { where("current_qty < threshold_qty") }
  end
  