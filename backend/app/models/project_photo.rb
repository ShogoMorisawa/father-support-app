class ProjectPhoto < ApplicationRecord
  KINDS = %w[before after other].freeze

  belongs_to :project

  validates :kind, inclusion: { in: KINDS }
  validates :key,  presence: true, length: { maximum: 500 }
  validates :content_type, length: { maximum: 255 }, allow_nil: true
  validates :byte_size, numericality: { greater_than: 0 }, allow_nil: true
end
