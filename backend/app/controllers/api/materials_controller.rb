module Api
    class MaterialsController < Api::BaseController
      def index
        order = (params[:order] || "name.asc").to_s
        rel = Material.all
        rel = case order
        when "name.desc" then rel.order(name: :desc)
        when "qty.asc"   then rel.order(current_qty: :asc)
        when "qty.desc"  then rel.order(current_qty: :desc)
        else                   rel.order(name: :asc)
        end
        limit = [ (params[:limit] || 200).to_i, 500 ].min
        items = rel.limit(limit).map { |m| serialize(m) }
        render_ok(data: { items: items })
      end

      def low
        items = Material.low_stock.order(name: :asc).map { |m| serialize(m) }
        render_ok(data: { items: items })
      end

      private

      def serialize(m)
        {
          id: m.id,
          name: m.name,
          unit: m.unit,
          currentQty: m.current_qty.to_f,
          thresholdQty: m.threshold_qty.to_f,
          low: m.current_qty < m.threshold_qty
        }
      end
    end
end
