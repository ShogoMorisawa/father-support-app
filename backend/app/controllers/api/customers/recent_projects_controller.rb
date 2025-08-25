class Api::Customers::RecentProjectsController < Api::BaseController
  def index
    limit = (params[:limit] || 10).to_i.clamp(1, 50)
    items = Customers::RecentProjectsQuery.call(customer_id: params[:customer_id], limit:)
    render json: { items: items }
  end
end
