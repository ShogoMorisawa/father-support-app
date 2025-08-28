module Estimates
  class StockPreviewService
    Result = Struct.new(:overall_status, :summary, :per_line, :shortages, :unregistered, keyword_init: true)

    def self.call(estimate:, availability_map: nil)
      new(estimate, availability_map).call
    end

    def initialize(estimate, availability_map = nil)
      @estimate = estimate
      @availability_map = availability_map || build_availability_map
    end

    def call
      insufficient = []
      unregistered = []
      per_line_statuses = []

      @estimate.estimate_items.includes(:material).each do |item|
        required = item.quantity.to_d
        next unless required > 0

        material = item.material
        if material.nil?
          # 未登録（在庫不明）
          unregistered << {
            name: item.material_name,
            required: required.to_f,
            unit: item.material&.unit || '個' # デフォルト単位
          }
          per_line_statuses << 'unregistered'
        else
          # 在庫チェック
          availability = @availability_map[material.id]
          if availability && availability[:available_qty] >= required
            per_line_statuses << 'ok'
          else
            per_line_statuses << 'shortage'
            insufficient << {
              name: material.name,
              required: required.to_f,
              available: availability&.dig(:available_qty)&.to_f || 0.0,
              shortage: (required - (availability&.dig(:available_qty) || 0)).to_f,
              unit: material.unit
            }
          end
        end
      end

      Result.new(
        overall_status: insufficient.any? ? 'shortage' : 'ok',
        summary: {
          insufficient_count: insufficient.length,
          unregistered_count: unregistered.length
        },
        per_line: per_line_statuses.map { |status| { status: status } },
        shortages: insufficient,
        unregistered: unregistered
      )
    end

    private

    def build_availability_map
      # Phase 1 の CalculateCommittedService を活用
      committed_by_mat = Inventory::CalculateCommittedService.call
      
      # 見積で使用される材料IDも含める
      estimate_material_ids = @estimate.estimate_items.includes(:material).where.not(material_id: nil).pluck(:material_id)
      all_material_ids = (committed_by_mat.keys + estimate_material_ids).uniq
      
      # 材料の現在庫を取得
      materials = Material.where(id: all_material_ids).index_by(&:id)
      
      # 可用性マップを構築
      availability_map = all_material_ids.map do |material_id|
        material = materials[material_id]
        current = material&.current_qty || 0.to_d
        committed = committed_by_mat[material_id] || 0.to_d
        available = current - committed
        

        
        [material_id, {
          current_qty: current,
          committed_qty: committed,
          available_qty: available
        }]
      end.to_h
      

      availability_map
    end
  end
end
