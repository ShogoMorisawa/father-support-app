class Material < ApplicationRecord
    self.locking_column = :lock_version

    # カテゴリの選択肢
    CATEGORIES = %w[障子 網戸 襖].freeze

    validates :name, presence: { message: "名前を入力してください" }, 
                     uniqueness: { case_sensitive: false, message: "同名の資材が既に存在します" }
    validates :category, presence: { message: "カテゴリを選択してください" },
                        inclusion: { in: CATEGORIES, message: "有効なカテゴリを選択してください" }
    validates :unit, presence: { message: "単位を入力してください" }
    validates :current_qty, :threshold_qty,
              numericality: { 
                greater_than_or_equal_to: 0, 
                message: "0以上の数値を入力してください"
              }, 
              presence: true

    # 前後空白の除去と軽い正規化
    before_validation :normalize_attributes

    scope :low_stock, -> { where("current_qty < threshold_qty") }

    private

    def normalize_attributes
      self.name = name&.strip if name.present?
      self.unit = unit&.strip if unit.present?
    end
end
