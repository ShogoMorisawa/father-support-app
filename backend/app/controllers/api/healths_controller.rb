module Api
  class HealthsController < BaseController
    def show
      render_ok(data: { status: "ok", time: Time.now.utc.iso8601 })
    end
  end
end