module Api
    class CustomersController < Api::BaseController
      def search
        q = params[:q].to_s.strip
        limit = [ (params[:limit] || 20).to_i, 100 ].min
        rel = q.present? ? Customer.search_like(q) : Customer.all
        items = rel.order(:name).limit(limit).map { |c| serialize(c) }
        render_ok(data: { items: items })
      end

      private

      def serialize(c)
        {
          id: c.id,
          name: c.name,
          nameKana: c.name_kana,
          phone: c.phone,
          address: c.address
        }
      end
    end
end
