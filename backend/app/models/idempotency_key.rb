class IdempotencyKey < ApplicationRecord
    validates :key, presence: true, uniqueness: true
    validates :status, presence: true
    # response は JSONB（保存済みレスポンスボディ）
  end
  