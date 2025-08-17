module Api
    module Tasks
      class CompletionsController < Api::BaseController
        include RequireIdempotency
  
        def create
          result = ::Tasks::CompleteService.call(task_id: params[:id])
          if result.ok
            render_ok(data: { id: result.task.id, status: result.task.status })
          else
            status = case result.error_code
                     when "not_found" then 404
                     when "conflict"  then 409
                     else 422 end
            render_error(code: result.error_code || "invalid", message: result.error_message || "invalid", status: status)
          end
        end
  
        def revert
          result = ::Tasks::RevertCompleteService.call(task_id: params[:id])
          if result.ok
            render_ok(data: { id: result.task.id, status: result.task.status })
          else
            status = case result.error_code
                     when "not_found" then 404
                     when "conflict"  then 409
                     else 422 end
            render_error(code: result.error_code || "invalid", message: result.error_message || "invalid", status: status)
          end
        end
      end
    end
  end
  