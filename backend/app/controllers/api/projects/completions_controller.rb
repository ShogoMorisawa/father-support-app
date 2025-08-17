module Api
    module Projects
      class CompletionsController < Api::BaseController
        include RequireIdempotency

        # POST /api/projects/:project_id/complete
        def create
          result = ::Projects::CompleteService.call(project_id: params[:project_id])
          if result.ok
            render_ok(data: {
              projectId: result.project.id,
              status: result.project.status
            })
          else
            code = result.error_code
            status = case code
                     when "not_found" then 404
                     when "conflict" then 409
                     when "precondition_failed" then 422
                     else 422
                     end
            render_error(code: code, message: result.error_message, status: status)
          end
        end

        # POST /api/projects/:project_id/revert-complete
        def revert
          result = ::Projects::RevertCompleteService.call(project_id: params[:project_id])
          if result.ok
            render_ok(data: { projectId: result.project.id, status: result.project.status })
          else
            code = result.error_code
            status = case code
                     when "not_found" then 404
                     when "conflict" then 409
                     when "precondition_failed" then 422
                     else 422
                     end
            render_error(code: code, message: result.error_message, status: status)
          end
        end
      end
    end
end
