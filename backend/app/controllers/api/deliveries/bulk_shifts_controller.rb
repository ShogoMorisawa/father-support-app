module Api
    module Deliveries
      class BulkShiftsController < Api::BaseController
        include RequireIdempotency

        def create
          payload = params.permit(:days, :status, :from, :to, :reason, ids: []).to_h
          result  = ::Deliveries::BulkShiftService.call(
            days: payload["days"],
            status: payload["status"],
            from: payload["from"],
            to: payload["to"],
            ids: payload["ids"],
            reason: payload["reason"]
          )
          if result.ok
            render_ok(data: { affected: result.items.size, items: result.items.map { |x|
              { id: x[:id], oldDate: x[:oldDate].to_s, newDate: x[:newDate].to_s }
            } })
          else
            status = result.error_code == "not_found" ? 404 : 422
            render_error(code: result.error_code || "invalid", message: result.error_message, status: status)
          end
        end
      end
    end
end
