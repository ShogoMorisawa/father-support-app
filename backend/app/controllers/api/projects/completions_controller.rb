module Api
    module Projects
      class CompletionsController < Api::BaseController
        include RequireIdempotency
  
        # POST /api/projects/:project_id/complete
        def create
          result = ::Projects::CompleteService.call(project_id: params[:project_id], completed_at: Time.current)
          if result.ok
            # （OpenAPIは最小想定）low_stockは応答に含めず、必要ならサービスで利用
            render_ok(data: { projectId: result.project.id, status: result.project.status })
          else
            code = result.error_code
            status = (code == "conflict") ? 409 : (code == "not_found" ? 404 : 422)
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
            status = (code == "conflict") ? 409 : (code == "not_found" ? 404 : 422)
            render_error(code: code, message: result.error_message, status: status)
          end
        end
      end
    end
  end
  