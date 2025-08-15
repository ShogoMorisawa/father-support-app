class Task < ApplicationRecord
    belongs_to :project
    has_many :task_materials, dependent: :delete_all
  
    enum :status, { todo: "todo", doing: "doing", done: "done" }, validate: true
  
    validates :title, presence: true, length: { maximum: 200 }
  end
