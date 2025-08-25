class Customers::RecentProjectsQuery
  def self.call(customer_id:, limit: 10)
    new(customer_id:, limit:).call
  end

  def initialize(customer_id:, limit:)
    @customer_id = customer_id.to_i
    @limit = limit
  end

  # 各プロジェクトの最新監査ログ(or 更新時刻)で並べる簡易版
  def call
    # latest_log_at を lateral で拾えるならベターだが、まずは updated_at ベース + 直近ログ1件を別クエリで補完
    projects = Project.where(customer_id: @customer_id)
                      .select(:id, :title, :status, :due_on, :updated_at)
                      .order(updated_at: :desc)
                      .limit(@limit)

    # ログ要約（あれば最新1件）
    log_map = AuditLog.where(target_type: "Project", target_id: projects.map(&:id))
                      .order(created_at: :desc)
                      .select(:target_id, :summary, :created_at)
                      .group_by(&:target_id)
                      .transform_values { |logs| { summary: logs.first.summary, at: logs.first.created_at } }

    projects.map do |p|
      h = log_map[p.id]
      {
        id: p.id,
        title: p.title,
        status: p.status,
        dueOn: p.due_on,
        lastActivityAt: (h&.dig(:at) || p.updated_at),
        lastActivitySummary: h&.dig(:summary)
      }
    end
  end
end
