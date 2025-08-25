class Api::Customers::MemosController < Api::BaseController
  def index
    limit = (params[:limit] || 20).to_i.clamp(1, 100)
    items = CustomerMemo.where(customer_id: params[:customer_id])
                        .order(created_at: :desc)
                        .limit(limit)
                        .select(:id, :body, :created_at)
    render json: { items: items.as_json }
  end

  def create
    memo = CustomerMemo.create!(customer_id: params[:customer_id], body: params.require(:body))
    # 監査ログが必要ならここで作成
    render json: { memo: memo.as_json }, status: :created
  end
end
