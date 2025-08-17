module Deliveries
    class BulkShiftService
      Result = Struct.new(:ok, :items, :error_code, :error_message, keyword_init: true)

      def self.call(days:, status: "pending", from: nil, to: nil, ids: nil, reason: nil)
        new(days:, status:, from:, to:, ids:, reason:).call
      end

      def initialize(days:, status:, from:, to:, ids:, reason:)
        @days   = Integer(days)
        @status = (status.presence || "pending").to_s
        @from_s = from
        @to_s   = to
        @ids    = Array(ids).presence
        @reason = reason
      end

      def call
        return Result.new(ok: false, error_code: "invalid", error_message: "days=0 は指定できません。") if @days == 0
        return Result.new(ok: false, error_code: "invalid", error_message: "days は -30..30 で指定してください。") unless (-30..30).cover?(@days)

        ActiveRecord::Base.transaction do
          rel = Delivery.lock
          rel = rel.where(status: "pending") unless @status == "all"

          if @ids
            rel = rel.where(id: @ids)
          else
            from_d = parse_date(@from_s) if @from_s.present?
            to_d   = parse_date(@to_s)   if @to_s.present?
            rel = rel.where("date >= ?", from_d) if from_d
            rel = rel.where("date <= ?", to_d)   if to_d
          end

          list = rel.to_a
          return Result.new(ok: false, error_code: "not_found", error_message: "対象がありません。") if list.empty?

          items = []
          list.each do |d|
            old = d.date
            d.date = old + @days
            d.save!
            items << { id: d.id, oldDate: old, newDate: d.date }
          end

          # 逆操作は同じ集合に対して -days を適用（ids を明示して確実に戻す）
          AuditLog.create!(
            action: "deliveries.bulk_shift",
            target_type: "delivery",
            target_id: 0,
            summary: "納品予定を#{@days}日シフト（#{items.size}件）#{@reason.present? ? " / " + @reason : ""}",
            inverse: {
              method: "POST",
              path: "/api/deliveries/bulk-shift",
              payload: { days: -@days, ids: items.map { |x| x[:id] }, reason: "undo" }
            },
            correlation_id: nil,
            actor: nil
          )

          Result.new(ok: true, items: items)
        end
      rescue ArgumentError => e
        Result.new(ok: false, error_code: "invalid", error_message: e.message)
      end

      private

      def parse_date(s)
        Date.parse(s)
      end
    end
end
