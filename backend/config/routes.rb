Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
  namespace :api do
    resource :health, only: [ :show ]

    resources :projects, only: [] do
      # /api/projects/:project_id/complete
      post :complete, to: "projects/completions#create"
      # /api/projects/:project_id/revert-complete
      post "revert-complete", to: "projects/completions#revert"
    end

    # /api/deliveries?status=pending&order=date.asc&limit=200
    resources :deliveries, only: [ :index ]
    post "deliveries/bulk-shift", to: "deliveries/bulk_shifts#create"

    # /api/history  … 直近の履歴（監査ログ）
    get "history", to: "histories#index"

    resources :estimates, only: [ :index, :create ] do
      post :complete, to: "estimates/completions#create"
    end

    resources :materials, only: [ :index ]
    get "materials/low", to: "materials#low"

    get "customers/search", to: "customers#search"

    resources :tasks, only: [ :index ]

    post "materials/:material_id/receive", to: "materials/receives#create"
  end
end
