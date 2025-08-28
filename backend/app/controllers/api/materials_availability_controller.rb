module Api
  class MaterialsAvailabilityController < BaseController
    def index
      # 並び替えパラメータを取得
      order = (params[:order] || "available.asc").to_s
      limit = [(params[:limit] || 200).to_i, 500].min
      
      # 予定消費を一括取得
      committed_by_mat = Inventory::CalculateCommittedService.call

      materials = Material.order(:name)
      items = materials.map do |m|
        committed = committed_by_mat[m.id] || 0.to_d
        current   = m.current_qty || 0.to_d
        available = current - committed
        threshold = m.threshold_qty || 0.to_d

        status =
          if available < 0
            'shortage'
          elsif available < threshold
            'low'
          else
            'ok'
          end

        {
          id: m.id,
          name: m.name,
          unit: m.unit,
          category: m.category,
          currentQty: current.to_f,
          committedQty: committed.to_f,
          availableQty: available.to_f,
          thresholdQty: threshold.to_f,
          status: status
        }
      end

      # 並び替えを適用
      items = sort_items(items, order)
      
      # 件数制限
      items = items.first(limit)

      render_ok(data: { items: items })
    end

    private

    def sort_items(items, order)
      case order
      when "available.asc"
        items.sort_by { |item| item[:availableQty] }
      when "available.desc"
        items.sort_by { |item| -item[:availableQty] }
      when "name.asc"
        items.sort_by { |item| item[:name] }
      when "name.desc"
        items.sort_by { |item| item[:name] }.reverse
      else
        items.sort_by { |item| item[:availableQty] } # デフォルト
      end
    end
  end
end
