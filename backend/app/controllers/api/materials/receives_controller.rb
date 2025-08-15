module Api
    module Materials
      class ReceivesController < Api::BaseController
        include RequireIdempotency
  
        def create
          qty  = params[:quantity]
          note = params[:note]
          result = ::Materials::ReceiveService.call(material_id: params[:material_id], quantity: qty, note: note)
          if result.ok
            m = result.material
            render_ok(data: {
              materialId:  m.id,
              name:        m.name,
              currentQty:  m.current_qty.to_f,
              thresholdQty: m.threshold_qty.to_f,
              low:         m.current_qty < m.threshold_qty
            })
          else
            status = result.error_code == "not_found" ? 404 : 422
            render_error(code: result.error_code || "invalid", message: result.error_message, status: status)
          end
        end
      end
    end
  end
  