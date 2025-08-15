module Api
  class BaseController < ActionController::API
    private

    def correlation_id
      @correlation_id ||= "cid_#{Time.now.to_i.to_s(36)}_#{SecureRandom.hex(3)}"
    end

    def render_ok(data:, status: 200)
      render json: { ok: true, data: data, correlationId: correlation_id }, status: status
    end

    def render_error(code:, message:, status:)
      render json: { ok: false, error: { code: code, message: message }, correlationId: correlation_id }, status: status
    end
  end
end