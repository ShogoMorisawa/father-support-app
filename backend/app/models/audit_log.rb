class AuditLog < ApplicationRecord
    # inverse は { method:, path:, payload: } を想定
    validates :action, :target_type, :target_id, presence: true
  end
  