class EstimateItem < ApplicationRecord
    belongs_to :estimate
    belongs_to :material, optional: true
  
    validates :material_name, presence: true
    validates :quantity, numericality: { greater_than_or_equal_to: 0 }
  end
  