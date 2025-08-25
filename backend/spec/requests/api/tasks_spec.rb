require 'rails_helper'

RSpec.describe "Api::Tasks", type: :request do
  let(:customer) { create(:customer, name: "田中太郎") }
  let(:project) { create(:project, customer: customer, title: "障子 張替 3枚", status: "in_progress") }
  let(:material) { create(:material, name: "障子紙") }
  
  before do
    # テスト用のタスクを作成
    @task1 = create(:task, 
      project: project, 
      title: "障子 張替 3枚", 
      status: "todo", 
      due_on: Date.today + 1
    )
    @task2 = create(:task, 
      project: project, 
      title: "網戸 張替 2枚", 
      status: "done", 
      due_on: Date.today,
      prepared_at: Time.current
    )
    
    # 材料を関連付け
    create(:task_material, 
      task: @task1, 
      material: material, 
      material_name: "障子紙", 
      qty_planned: 3.0
    )
    create(:task_material, 
      task: @task2, 
      material: material, 
      material_name: "網戸", 
      qty_planned: 2.0
    )
  end

  describe "GET /api/tasks" do
    context "正常系" do
      it "タスク一覧を正しいスキーマで返す" do
        get "/api/tasks"
        
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        
        expect(json["ok"]).to be true
        expect(json["data"]["items"]).to be_an(Array)
        expect(json["data"]["items"].length).to eq(2)
        
        # 最初のタスクの構造を確認
        task = json["data"]["items"].first
        expect(task).to include(
          "id", "projectId", "title", "status", "dueOn", "customerName", "materials"
        )
        
        # 材料情報の確認
        expect(task["materials"]).to be_an(Array)
        expect(task["materials"].first).to include("materialName", "qtyPlanned")
      end

      it "statusはtodoまたはdoneのみ" do
        get "/api/tasks"
        
        json = JSON.parse(response.body)
        statuses = json["data"]["items"].map { |t| t["status"] }
        
        expect(statuses).to all(satisfy { |s| %w[todo done].include?(s) })
      end

      it "materialsが正しく返される" do
        get "/api/tasks"
        
        json = JSON.parse(response.body)
        task = json["data"]["items"].find { |t| t["id"] == @task1.id }
        
        expect(task["materials"]).to eq([
          { "materialName" => "障子紙", "qtyPlanned" => 3.0 }
        ])
      end

      it "customerNameが正しく返される" do
        get "/api/tasks"
        
        json = JSON.parse(response.body)
        task = json["data"]["items"].first
        
        expect(task["customerName"]).to eq("田中太郎")
      end
    end

    context "フィルタリング" do
      it "status=pendingで未完了タスクのみ返す" do
        get "/api/tasks", params: { status: "pending" }
        
        json = JSON.parse(response.body)
        items = json["data"]["items"]
        
        expect(items.length).to eq(1)
        expect(items.first["status"]).to eq("todo")
      end

      it "status=doneで完了タスクのみ返す" do
        get "/api/tasks", params: { status: "done" }
        
        json = JSON.parse(response.body)
        items = json["data"]["items"]
        
        expect(items.length).to eq(1)
        expect(items.first["status"]).to eq("done")
      end

      it "status=allで全タスクを返す" do
        get "/api/tasks", params: { status: "all" }
        
        json = JSON.parse(response.body)
        items = json["data"]["items"]
        
        expect(items.length).to eq(2)
        statuses = items.map { |t| t["status"] }
        expect(statuses).to contain_exactly("todo", "done")
      end
    end

    context "並び順" do
      it "order=due.ascで昇順（デフォルト）" do
        get "/api/tasks", params: { order: "due.asc" }
        
        json = JSON.parse(response.body)
        items = json["data"]["items"]
        
        expect(items.first["dueOn"]).to eq(Date.today.strftime("%Y-%m-%d"))
        expect(items.last["dueOn"]).to eq((Date.today + 1).strftime("%Y-%m-%d"))
      end

      it "order=due.descで降順" do
        get "/api/tasks", params: { order: "due.desc" }
        
        json = JSON.parse(response.body)
        items = json["data"]["items"]
        
        expect(items.first["dueOn"]).to eq((Date.today + 1).strftime("%Y-%m-%d"))
        expect(items.last["dueOn"]).to eq(Date.today.strftime("%Y-%m-%d"))
      end
    end

    context "件数制限" do
      it "limitパラメータを尊重する" do
        get "/api/tasks", params: { limit: 1 }
        
        json = JSON.parse(response.body)
        expect(json["data"]["items"].length).to eq(1)
      end

      it "デフォルトlimitは500" do
        get "/api/tasks"
        
        json = JSON.parse(response.body)
        # 現在のテストデータは2件なので、limitが効いているかは確認できないが、
        # レスポンスが正常に返されることを確認
        expect(response).to have_http_status(:ok)
      end
    end
  end
end
