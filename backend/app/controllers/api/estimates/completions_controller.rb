module Api
    module Estimates
      class CompletionsController < Api::BaseController
        include RequireIdempotency

        def create
          payload = params.permit!.to_h
          result = ::Estimates::CompleteService.call(estimate_id: params[:estimate_id], payload: payload)
          if result.ok
            render_ok(data: {
              estimateId: result.estimate.id,
              accepted: result.estimate.accepted,
              projectId: result.project&.id
            })
          else
            status = result.error_code == "not_found" ? 404 : (result.error_code == "conflict" ? 409 : 422)
            render_error(code: result.error_code || "invalid", message: result.error_message, status: status)
          end
        end
      end
    end
end
