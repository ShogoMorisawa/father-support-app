module Materials
    class ReceiveService
      Result = Struct.new(:ok, :material, :error_code, :error_message, keyword_init: true)
  
      def self.call(material_id:, quantity:, note: nil)
        new(material_id: material_id, quantity: quantity, note: note).call
      end
  
      def initialize(material_id:, quantity:, note:)
        @material_id = material_id.to_i
        @quantity = BigDecimal(quantity.to_s)
        @note = note
      end
  
      def call
        return Result.new(ok: false, error_code: "invalid", error_message: "数量は正の数で指定してください。") if @quantity <= 0
  
        ActiveRecord::Base.transaction do
          mat = Material.lock.find(@material_id)
          mat.current_qty = (mat.current_qty.to_d + @quantity)
          mat.save!
  
          AuditLog.create!(
            action: "material.receive",
            target_type: "material",
            target_id: mat.id,
            summary: "入庫 #{@quantity.to_s('F')} #{mat.unit}".strip,
            inverse: {
              method: "POST",
              path: "/api/materials/#{mat.id}/receive",
              payload: { quantity: -@quantity.to_f, note: "undo" }
            },
            correlation_id: nil,
            actor: nil
          )
  
          Result.new(ok: true, material: mat)
        end
      rescue ActiveRecord::RecordNotFound
        Result.new(ok: false, error_code: "not_found", error_message: "在庫が見つかりません。")
      rescue ActiveRecord::RecordInvalid => e
        Result.new(ok: false, error_code: "invalid", error_message: e.record.errors.full_messages.join(", "))
      end
    end
  end
