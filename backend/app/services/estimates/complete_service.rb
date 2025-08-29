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
          
          # 納品時刻の処理
          scheduled_at = nil
          delivery_at_s = @payload["deliveryAt"] || @payload["delivery_at"]
          if delivery_at_s.present?
            begin
              scheduled_at = Time.parse(delivery_at_s)
            rescue ArgumentError
              # 時刻の解析に失敗した場合は、日付のみを使用
              scheduled_at = due_on ? due_on.to_datetime.change({ hour: 10, min: 0 }) : nil
            end
          elsif due_on.present?
            # デフォルト時刻は10:00
            scheduled_at = due_on.to_datetime.change({ hour: 10, min: 0 })
          end

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
            
            # 納品予定を作成
            delivery = Delivery.create!(
              project: project,
              date: due_on || Date.current,
              status: "pending",
              title: "納品",
              scheduled_at: scheduled_at
            )
            
            # 見積もりアイテムまたはフロントエンドから送信された明細データを基にタスクを作成
            items = @payload["items"] || []
            
            # 明細データが存在しない場合の処理
            if items.empty? && est.estimate_items.empty?
              # 明細データが全く存在しない場合はエラー
              raise ActiveRecord::RecordInvalid.new(
                OpenStruct.new(
                  errors: OpenStruct.new(
                    full_messages: ["明細データが存在しません。見積もりを成立できません。"]
                  )
                )
              )
            end
            
            if items.any?
              # フロントエンドから送信された明細データを基にタスクを作成
              items.each do |item|
                next unless item["materialName"] && item["qty"] && item["qty"].to_f > 0
                
                task_title = "#{item['materialName']} #{item['qty']}#{item['unit'] || ''}"
                
                task = Task.create!(
                  project: project, 
                  title: task_title,
                  kind: item["category"] || "work",
                  status: "todo", 
                  due_on: due_on || Date.current
                )
                
                # 材料情報を設定
                TaskMaterial.create!(
                  task: task,
                  material: (Material.find_by(id: item["materialId"]) || Material.find_by(name: item["materialName"])),
                  material_name: item["materialName"],
                  qty_planned: item["qty"].to_f,
                  qty_used: nil,
                  unit: item["unit"]
                )
              end
            elsif est.estimate_items.any?
              # 既存の見積もりアイテムを基にタスクを作成
              est.estimate_items.find_each do |ei|
                task_title = "#{ei.material_name} #{ei.qty}#{ei.unit}"
                
                task = Task.create!(
                  project: project, 
                  title: task_title,
                  kind: ei.category || "work",
                  status: "todo", 
                  due_on: due_on || Date.current
                )
                
                # 材料情報を設定
                TaskMaterial.create!(
                  task: task,
                  material: (Material.find_by(id: ei.material_id) || Material.find_by(name: ei.material_name)),
                  material_name: ei.material_name,
                  qty_planned: ei.qty,
                  qty_used: nil,
                  unit: ei.unit
                )
              end
            end
          end

          # 見積もりの更新は最後に行う（タスク・納品作成が成功した後に）
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
