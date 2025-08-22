class Photo < ApplicationRecord
  belongs_to :project
  KINDS = %w[before after other].freeze
  validates :kind, inclusion: { in: KINDS }
  validates :blob_key, presence: true

  # 表示用の公開URL（CDN等）。ENV 未設定ならダミーにフォールバック
  def public_url
    base = ENV["PUBLIC_BLOB_BASE_URL"].presence || "https://example.com/uploads"
    "#{base}/#{blob_key}"
  end
end
