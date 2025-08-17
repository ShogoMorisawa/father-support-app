module Api
    class DashboardController < Api::BaseController
      # GET /api/dashboard?date=YYYY-MM-DD&estimatesLimit=3&tasksLimit=5&deliveriesLimit=3&historyLimit=5&lowLimit=3
      def show
        date = params[:date].present? ? Date.parse(params[:date]) : jst_today
        est_lim = limit_of(params[:estimatesLimit], 3, 50)
        tsk_lim = limit_of(params[:tasksLimit], 5, 200)
        del_lim = limit_of(params[:deliveriesLimit], 3, 200)
        his_lim = limit_of(params[:historyLimit], 5, 50)
        low_lim = limit_of(params[:lowLimit], 3, 50)

        start_jst = Time.find_zone("Asia/Tokyo").local(date.year, date.month, date.day)

        estimates = Estimate.where(status: %w[scheduled])
                            .where("scheduled_at >= ?", start_jst)
                            .order(scheduled_at: :asc)
                            .limit(est_lim)
                            .map { |e| serialize_estimate(e) }

        tasks = Task.includes(project: :customer)
                            .joins(:project)
                            .where(tasks:   { status: %w[todo doing] })
                            .where(projects: { status: %w[in_progress delivery_scheduled] })
                            .where("tasks.due_on IS NULL OR tasks.due_on >= ?", date)
                            .order(Arel.sql("tasks.due_on ASC NULLS LAST"))
                            .limit(tsk_lim)
                            .map { |t| serialize_task(t) }

        deliveries = Delivery.includes(project: :customer)
                             .where(status: "pending")
                             .where("date >= ?", date)
                             .order(date: :asc)
                             .limit(del_lim)
                             .map { |d| serialize_delivery(d) }

        low_scope = Material.where("current_qty < threshold_qty")
        low_count = low_scope.count
        low_items = low_scope.order(Arel.sql("(threshold_qty - current_qty) DESC"))
                             .limit(low_lim)
                             .map { |m| serialize_material_low(m) }

        history = AuditLog.order(created_at: :desc)
                          .limit(his_lim)
                          .map { |log| serialize_history(log) }

        render_ok(data: {
          date: date.to_s,
          estimates: estimates,
          tasks: tasks,
          deliveries: deliveries,
          lowStock: { count: low_count, items: low_items },
          history: { items: history }
        })
      rescue ArgumentError
        render_error(code: "invalid", message: "date の形式が不正です。", status: 422)
      end

      private

      def jst_today
        Time.zone = "Asia/Tokyo" unless Time.zone&.name == "Asia/Tokyo"
        Time.zone.today
      end

      def limit_of(val, default, max)
        [ [ (val || default).to_i, 1 ].max, max ].min
      end

      def serialize_estimate(e)
        {
          id: e.id,
          scheduledAt: e.scheduled_at&.iso8601,
          status: e.status,
          accepted: e.accepted,
          customerName: e.customer_snapshot&.dig("name") || e.customer&.name
        }
      end

      def serialize_task(t)
        {
          id: t.id,
          projectId: t.project_id,
          title: t.title,
          status: t.status,
          dueOn: t.due_on&.strftime("%Y-%m-%d"),
          customerName: t.project&.customer&.name
        }
      end

      def serialize_delivery(d)
        {
          id: d.id,
          projectId: d.project_id,
          date: d.date&.to_s,
          status: d.status,
          title: d.title,
          customerName: d.project&.customer&.name
        }
      end

      def serialize_material_low(m)
        {
          materialId: m.id,
          name: m.name,
          currentQty: m.current_qty.to_f,
          thresholdQty: m.threshold_qty.to_f
        }
      end

      def serialize_history(log)
        {
          id: log.id,
          action: log.action,
          targetType: log.target_type,
          targetId: log.target_id,
          summary: log.summary,
          createdAt: log.created_at&.iso8601,
          inverse: (log.inverse || {}),
          canUndo: compute_can_undo(log)
        }
      end

      # HistoriesController と同等のロジック（必要最小限）
      def compute_can_undo(log)
        return false if log.inverse.blank?
        case log.action
        when "project.complete"
          Project.find_by(id: log.target_id)&.completed?
        when "project.revert_complete"
          prj = Project.find_by(id: log.target_id)
          prj.present? && !prj.completed?
        when "deliveries.bulk_shift"
          true
        else
          false
        end
      rescue
        false
      end
    end
end
