module RequireIdempotency
    extend ActiveSupport::Concern

    included do
      before_action :check_idempotency_for_mutations
      after_action  :store_idempotency_response
    end

    private

    def mutation_request?
      request.post? || request.put? || request.patch? || request.delete?
    end

    def scoped_idempotency_key
      key = request.headers["X-Idempotency-Key"].to_s.strip
      return nil if key.blank?
      # 同じキーでもエンドポイントが違えば別物として扱う
      "#{request.method}:#{request.path}:#{key}"
    end

    def check_idempotency_for_mutations
      return unless mutation_request?

      @__idem_scoped_key = scoped_idempotency_key
      unless @__idem_scoped_key
        render json: { ok: false, error: { code: "missing_idempotency", message: "Idempotencyキーが必要です。" } },
               status: 400 and return
      end

      if (rec = IdempotencyKey.find_by(key: @__idem_scoped_key))
        # 結果リプレイ
        body = rec.response.presence || {}
        render json: body, status: rec.status and return
      end
      # なければ処理続行（実行結果を after_action で保存する）
    end

    def store_idempotency_response
      return unless mutation_request?
      return if performed? == false # 念のため
      return unless @__idem_scoped_key

      # レスポンスボディをJSONとして保存（失敗してもアプリの応答は返す）
      begin
        payload = response.media_type == "application/json" ? JSON.parse(response.body) : {}
        IdempotencyKey.create!(
          key: @__idem_scoped_key,
          status: response.status,
          response: payload
        )
      rescue => _e
        # 永続化失敗は黙殺（監視/ログは後で）
      end
    end
end
