# frozen_string_literal: true

class Api::Projects::CompletedController < ApplicationController
  # GET /api/projects/completed?from=YYYY-MM-DD&to=YYYY-MM-DD&q=...&order=completed.desc&limit=100
  def index
    from  = parse_ymd(params[:from]) || (Date.today - 30) # 既定：直近30日
    to    = parse_ymd(params[:to])   || Date.today
    q     = params[:q].to_s.strip
    order = %w[completed.desc completed.asc].include?(params[:order]) ? params[:order] : "completed.desc"
    limit = (params[:limit].presence || 100).to_i

    items = ::Projects::CompletedQuery.call(from:, to:, q:, order:, limit:)

    render json: { ok: true, data: { items: items } }
  end

  private

  def parse_ymd(s)
    return nil if s.blank?
    Date.strptime(s, "%Y-%m-%d") rescue nil
  end
end
