namespace :idempotency do
  desc "古いIdempotencyキーを削除（14日以上前）"
  task cleanup: :environment do
    cutoff_date = 14.days.ago
    count = IdempotencyKey.where("created_at < ?", cutoff_date).count
    
    if count > 0
      IdempotencyKey.where("created_at < ?", cutoff_date).delete_all
      puts "✅ #{count}件の古いIdempotencyキーを削除しました（#{cutoff_date}以前）"
    else
      puts "ℹ️  削除対象のIdempotencyキーはありません"
    end
  end

  desc "Idempotencyキーの統計情報を表示"
  task stats: :environment do
    total = IdempotencyKey.count
    oldest = IdempotencyKey.minimum(:created_at)
    newest = IdempotencyKey.maximum(:created_at)
    
    puts "📊 Idempotencyキー統計:"
    puts "  総数: #{total}件"
    puts "  最古: #{oldest&.strftime('%Y-%m-%d %H:%M:%S') || 'なし'}"
    puts "  最新: #{newest&.strftime('%Y-%m-%d %H:%M:%S') || 'なし'}"
    
    if total > 0
      # 日別集計（直近7日）
      7.times do |i|
        date = i.days.ago.to_date
        count = IdempotencyKey.where(created_at: date.beginning_of_day..date.end_of_day).count
        puts "  #{date.strftime('%m-%d')}: #{count}件"
      end
    end
  end
end
