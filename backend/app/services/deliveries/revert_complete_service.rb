module Deliveries
  class RevertCompleteService
    Result = Struct.new(:ok, :delivery, :error_code, :error_message, keyword_init: true)

    def self.call(delivery_id:)
      new(delivery_id:).call
    end

    def initialize(delivery_id:)
      @delivery_id = delivery_id.to_i
    end

    def call
      ActiveRecord::Base.transaction do
        delivery = ::Delivery.lock.find(@delivery_id)
        
        # 完了済みでない場合はエラー
        unless delivery.status == "delivered"
          return Result.new(
            ok: false, 
            error_code: "invalid_status", 
            error_message: "納品が完了済みではありません。"
          )
        end
        
        # 納品ステータスをpendingに戻す（完了日時もクリア）
        delivery.update!(status: "pending", completed_at: nil)
        
        # プロジェクトの状態も適切に戻す
        project = delivery.project
        if project.status == "completed"
          project.update!(status: "delivery_scheduled", completed_at: nil)
        end
        
        # 監査ログを作成
        ::AuditLog.create!(
          action: "delivery.revert_complete", 
          target_type: "delivery", 
          target_id: delivery.id, 
          summary: "納品完了を取り消しました",
          inverse: { method: "POST", path: "/api/deliveries/#{delivery.id}/complete", payload: {} }
        )
        
        Result.new(ok: true, delivery: delivery)
      end
    rescue ActiveRecord::RecordNotFound
      Result.new(ok: false, error_code: "not_found", error_message: "納品が見つかりません。")
    rescue ActiveRecord::StaleObjectError
      Result.new(ok: false, error_code: "conflict", error_message: "納品が他の操作で更新されています。ページを再読み込みしてください。")
    end
  end
end
