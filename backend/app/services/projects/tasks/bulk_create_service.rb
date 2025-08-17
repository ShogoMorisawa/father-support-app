class Projects::Tasks::BulkCreateService
  def self.call(project_id:, items:, delivery_on:)
    new(project_id:, items: items || [], delivery_on: delivery_on).call
  end

  def initialize(project_id:, items:, delivery_on:)
    @project_id = project_id.to_i
    @items = items
    @delivery_on = Date.parse(delivery_on.to_s)
  end

  def call
    ActiveRecord::Base.transaction do
      project = Project.lock.find(@project_id)
      raise StandardError, "project must be active" if project.status == "completed"

      # 納品予定日はプロジェクト単位
      project.update!(due_on: @delivery_on)

      # プロジェクトの Delivery（pending）を1件だけ維持
      delivery = Delivery.lock.where(project_id: project.id, status: "pending").first_or_initialize
      delivery.date  = @delivery_on
      delivery.title = delivery.title.presence || "納品"
      delivery.save!

      tasks = []

      @items.each do |it|
        title = it["title"].to_s.strip
        kind  = it["kind"].presence

        t = ::Task.create!(
          project_id: project.id,
          title: title,
          kind: kind,
          status: "todo",
          due_on: @delivery_on
        )
        tasks << t
      end

      Result.new(ok: true, project: project, tasks: tasks, deliveries: [delivery])
    end
  rescue StandardError => e
    Result.new(ok: false, error: e.message)
  end

  private

  class Result
    attr_reader :ok, :project, :tasks, :deliveries, :error

    def initialize(ok:, project: nil, tasks: nil, deliveries: nil, error: nil)
      @ok = ok
      @project = project
      @tasks = tasks
      @deliveries = deliveries
      @error = error
    end
  end
end
