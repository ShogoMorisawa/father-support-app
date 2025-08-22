# frozen_string_literal: true

module Projects
  class CompletedQuery
    # from/to は Date, order は "completed.desc" | "completed.asc"
    def self.call(from:, to:, q:, order:, limit:)
      dir = order == "completed.asc" ? "ASC" : "DESC"
      q_like = "%#{q}%"

      # パラメータを直接埋め込んでテスト
      from_at = from.to_time.beginning_of_day.utc
      to_next = (to + 1).to_time.beginning_of_day.utc
      
      sql = <<~SQL
        SELECT
          p.id,
          p.title,
          p.due_on,
          c.name AS customer_name,
          al.created_at AS completed_at,
          al.inverse  AS inverse
        FROM projects p
        JOIN customers c ON c.id = p.customer_id
        JOIN LATERAL (
          SELECT created_at, inverse
          FROM audit_logs
          WHERE target_type = 'project'
            AND action = 'project.complete'
            AND target_id = p.id
          ORDER BY created_at DESC
          LIMIT 1
        ) al ON TRUE
        WHERE p.status = 'completed'
          AND al.created_at >= '#{from_at}'
          AND al.created_at <  '#{to_next}'
          AND ('#{q.to_s}' = '' OR c.name ILIKE '#{q_like}' OR p.title ILIKE '#{q_like}')
        ORDER BY al.created_at #{dir}
        LIMIT 100
      SQL

      rows = ActiveRecord::Base.connection.exec_query(sql, "CompletedProjects")
      rows.map do |r|
        inverse = r["inverse"]
        inverse = JSON.parse(inverse) rescue inverse
        inverse = inverse.presence || { "method" => "POST", "path" => "/api/projects/#{r['id']}/revert-complete", "payload" => {} }

        {
          id:          r["id"],
          customerName: r["customer_name"],
          title:       r["title"],
          dueOn:       r["due_on"]&.to_s,
          completedAt: r["completed_at"],
          undo:        inverse
        }
      end
    end
  end
end
