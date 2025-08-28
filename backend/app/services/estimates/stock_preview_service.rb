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

      # 同一材料の合計requiredを事前計算
      material_totals = {}
      @estimate.estimate_items.includes(:material).each do |item|
        next unless item.qty && item.qty > 0
        
        if item.material_id
          material_totals[item.material_id] ||= 0
          material_totals[item.material_id] += item.qty
        end
      end

      @estimate.estimate_items.includes(:material).each do |item|
        required = item.qty.to_d
        next unless required > 0

        material = item.material
        if material.nil?
          # 未登録（在庫不明）
          unregistered << {
            name: item.material_name,
            required: required.to_f,
            unit: item.unit || '個'
          }
          per_line_statuses << 'unregistered'
        else
          # 同一材料の合計requiredで在庫チェック
          total_required = material_totals[material.id]
          availability = @availability_map[material.id]
          
          if availability && availability[:available_qty] >= total_required
            per_line_statuses << 'ok'
          else
            per_line_statuses << 'shortage'
            # 不足情報は既に計算済みの場合は追加しない
            unless insufficient.any? { |s| s[:name] == material.name }
              shortage = (total_required - (availability&.dig(:available_qty) || 0)).to_f
              insufficient << {
                name: material.name,
                required: total_required.to_f,
                available: availability&.dig(:available_qty)&.to_f || 0.0,
                shortage: shortage,
                unit: material.unit
              }
            end
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
