class Customer < ApplicationRecord
    has_many :projects, dependent: :restrict_with_exception
  
    validates :name, presence: true, length: { maximum: 100 }
    validates :name_kana, length: { maximum: 100 }, allow_blank: true
    validates :phone, length: { maximum: 20 }, allow_blank: true
  
    before_save :normalize_phone!
  
    scope :search_like, ->(q) {
      next all if q.blank?
      pattern = "%#{q}%"
      where("name ILIKE :q OR name_kana ILIKE :q OR phone ILIKE :q OR phone_normalized LIKE :qn",
            q: pattern, qn: q.gsub(/\D/, ""))
    }
  
    private
  
    def normalize_phone!
      self.phone_normalized = phone.to_s.gsub(/\D/, "") if will_save_change_to_phone?
    end
  end
  