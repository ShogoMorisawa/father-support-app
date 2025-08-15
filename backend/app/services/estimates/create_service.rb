module Estimates
    class CreateService
      Result = Struct.new(:ok, :estimate, :error_message, keyword_init: true)

      def self.call(payload)
        new(payload).call
      end

      def initialize(payload)
        @payload = payload || {}
      end

      def call
        ActiveRecord::Base.transaction do
          customer = upsert_customer!(@payload["customer"] || @payload["customerSnapshot"])
          scheduled_at = parse_time!(@payload["scheduledAt"] || @payload["scheduled_at"])

          est = Estimate.create!(
            customer: customer,
            scheduled_at: scheduled_at,
            status: "scheduled",
            accepted: nil,
            price_cents: nil,
            customer_snapshot: {
              name: customer&.name || @payload.dig("customer", "name"),
              phone: customer&.phone || @payload.dig("customer", "phone"),
              address: customer&.address || @payload.dig("customer", "address")
            }.compact
          )

          Array(@payload["items"]).each do |it|
            name = it["materialName"] || it["name"] || it["material_name"]
            qty  = it["quantity"] || it["qty"] || it["qtyPlanned"]
            EstimateItem.create!(
              estimate: est,
              material: Material.find_by(name: name),
              material_name: name.to_s,
              quantity: BigDecimal(qty.to_s)
            )
          end

          AuditLog.create!(
            action: "estimate.create",
            target_type: "estimate",
            target_id: est.id,
            summary: "見積を作成",
            # 将来の取り消しに備えて器だけ用意（エンドポイント定義後に置換）
            inverse: {}, correlation_id: nil, actor: nil
          )

          Result.new(ok: true, estimate: est)
        end
      rescue => e
        Result.new(ok: false, error_message: e.message)
      end

      private

      def upsert_customer!(c)
        return nil if c.blank?
        phone = c["phone"].to_s
        norm  = phone.gsub(/\D/, "")
        found = norm.present? ? Customer.find_by(phone_normalized: norm) : nil
        if found
          # 既存を軽く更新（名前や住所が空なら補完）
          found.name    = c["name"]    if found.name.blank? && c["name"].present?
          found.address = c["address"] if found.address.blank? && c["address"].present?
          found.phone   = phone        if found.phone.blank? && phone.present?
          found.save! if found.changed?
          return found
        end
        Customer.create!(
          name: c["name"].presence || "（不明）",
          phone: phone.presence,
          address: c["address"].presence
        )
      end

      def parse_time!(val)
        return Time.current if val.blank?
        Time.iso8601(val) rescue Time.parse(val.to_s)
      end
    end
end
