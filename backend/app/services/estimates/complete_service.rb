module Estimates
    class CompleteService
      Result = Struct.new(:ok, :estimate, :project, :error_code, :error_message, keyword_init: true)

      def self.call(estimate_id:, payload:)
        new(estimate_id: estimate_id, payload: payload).call
      end

      def initialize(estimate_id:, payload:)
        @estimate_id = estimate_id.to_i
        @payload = payload || {}
      end

      def call
        ActiveRecord::Base.transaction do
          est = Estimate.lock.find(@estimate_id)
          return Result.new(ok: false, error_code: "conflict", error_message: "すでに確定済みです。") if est.status == "completed"

          accepted    = !!(@payload["accepted"])
          price_cents = @payload["priceCents"] || @payload["price_cents"]
          title       = @payload["projectTitle"] || @payload["title"] || "新規案件"
          due_on_s    = @payload["dueOn"] || @payload["due_on"]
          due_on      = due_on_s.present? ? Date.parse(due_on_s) : nil

          project = nil
          if accepted
            # 顧客は見積の snapshot / customer を優先
            customer = est.customer || upsert_customer_from_snapshot!(est)
            project = Project.create!(
              customer: customer,
              title: title,
              status: "delivery_scheduled",
              due_on: due_on
            )
            # ❌ ここでダミータスクを自動生成していたのを削除
            # 見積アイテムを初期タスクの「計画」に引き継ぐ（在庫は動かさない）
            # task = Task.create!(project: project, title: "作業", status: "todo", due_on: due_on || Date.current)
            # est.estimate_items.find_each do |ei|
            #   TaskMaterial.create!(
            #     task: task,
            #     material: (Material.find_by(id: ei.material_id) || Material.find_by(name: ei.material_name)),
            #     material_name: ei.material_name,
            #     qty_planned: ei.quantity,
            #     qty_used: 0
            #   )
            # end
          end

          est.update!(
            status: "completed",
            accepted: accepted,
            price_cents: (accepted ? Integer(price_cents || 0) : nil),
            project: project
          )

          AuditLog.create!(
            action: "estimate.complete",
            target_type: "estimate",
            target_id: est.id,
            summary: accepted ? "見積成立" : "見積不成立",
            inverse: {}, correlation_id: nil, actor: nil
          )

          Result.new(ok: true, estimate: est, project: project)
        end
      rescue ActiveRecord::RecordNotFound
        Result.new(ok: false, error_code: "not_found", error_message: "見積が見つかりません。")
      rescue ArgumentError => e
        Result.new(ok: false, error_code: "invalid", error_message: e.message)
      rescue ActiveRecord::RecordInvalid => e
        Result.new(ok: false, error_code: "invalid", error_message: e.record.errors.full_messages.join(", "))
      end

      private

      def upsert_customer_from_snapshot!(est)
        snap = est.customer_snapshot || {}
        phone = snap["phone"].to_s
        norm  = phone.gsub(/\D/, "")
        Customer.find_by(phone_normalized: norm) ||
          Customer.create!(name: snap["name"].presence || "（不明）", phone: phone.presence, address: snap["address"].presence)
      end
    end
end
